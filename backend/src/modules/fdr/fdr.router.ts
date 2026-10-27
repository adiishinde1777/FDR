import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { preventAuditorMutation } from '../../middleware/rbac';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { FDRStatus, VerificationStatus, UserRole } from '../../config/constants';
import { canTransitionFDR } from '../../utils/stateMachine';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

// List FDR records with search, filter, pagination, and institution isolation
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      status,
      bank,
      institutionId,
      page = '1',
      limit = '10',
      minAmount,
      maxAmount,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Institution isolation: institution users can ONLY see their assigned institution FDRs
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      where.institutionId = { in: req.user!.institutionIds };
    } else if (institutionId) {
      where.institutionId = String(institutionId);
    }

    if (search) {
      where.OR = [
        { fdrNumber: { contains: String(search) } },
        { issuingBank: { contains: String(search) } },
        { bankBranch: { contains: String(search) } },
        { institution: { name: { contains: String(search) } } },
      ];
    }

    if (status) where.accountStatus = String(status);
    if (bank) where.issuingBank = { contains: String(bank) };
    if (minAmount) where.depositAmount = { ...(where.depositAmount || {}), gte: parseFloat(String(minAmount)) };
    if (maxAmount) where.depositAmount = { ...(where.depositAmount || {}), lte: parseFloat(String(maxAmount)) };

    const [records, total] = await Promise.all([
      prisma.fDRRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          institution: {
            select: { id: true, name: true, officialIdentifier: true, state: true },
          },
          securityDeposit: {
            select: { id: true, depositReference: true, programCategory: true },
          },
          _count: {
            select: { documents: true, verificationCases: true },
          },
        },
      }),
      prisma.fDRRecord.count({ where }),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get single FDR details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const fdr = await prisma.fDRRecord.findUnique({
      where: { id },
      include: {
        institution: true,
        securityDeposit: true,
        documents: {
          include: {
            ocrResult: true,
          },
        },
        verificationCases: {
          include: {
            assignedOfficer: {
              select: { id: true, fullName: true, email: true },
            },
            observations: true,
          },
        },
        approvalCases: {
          include: {
            decisions: {
              include: {
                approver: {
                  select: { id: true, fullName: true, email: true, role: true },
                },
              },
            },
          },
        },
        releaseRequests: true,
        oldInRenewals: {
          include: { newFdr: true },
        },
        newInRenewals: {
          include: { oldFdr: true },
        },
      },
    });

    if (!fdr) throw new AppError('FDR Record not found', 404, 'NOT_FOUND');

    // Security check: If institution user, verify ownership
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(fdr.institutionId)) {
        throw new AppError('Access denied: You do not have permission to view this FDR', 403, 'FORBIDDEN');
      }
    }

    return res.json({ success: true, data: fdr });
  } catch (err) {
    next(err);
  }
});

const createFDRSchema = z.object({
  institutionId: z.string().uuid(),
  securityDepositId: z.string().uuid().optional(),
  fdrNumber: z.string().min(3),
  issuingBank: z.string().min(2),
  bankBranch: z.string().min(2),
  ifscCode: z.string().optional(),
  depositAmount: z.number().positive(),
  currency: z.string().default('INR'),
  issueDate: z.string().transform((str) => new Date(str)),
  maturityDate: z.string().transform((str) => new Date(str)),
  validityDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
  jointName: z.string().optional(),
  autoRenewal: z.boolean().default(false),
  notes: z.string().optional(),
  isDraft: z.boolean().default(true),
});

// Create FDR record (Draft or Submitted)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createFDRSchema.parse(req.body);

    // Verify institution user permission
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(data.institutionId)) {
        throw new AppError('You can only create FDR records for your assigned institution', 403, 'FORBIDDEN');
      }
    }

    // Check duplicate detection rules:
    // "Prevent duplicate records using appropriate identifiers and duplicate-detection rules.
    // Potential duplicate detection must flag records for review rather than silently deleting or merging financial records."
    const existingSameNumber = await prisma.fDRRecord.findFirst({
      where: {
        fdrNumber: data.fdrNumber,
        issuingBank: data.issuingBank,
      },
    });

    const isPotentialDuplicate = !!existingSameNumber;
    const duplicateNotes = existingSameNumber
      ? `Flagged potential duplicate: Existing record with same FDR number (${data.fdrNumber}) and bank (${data.issuingBank}) found with ID: ${existingSameNumber.id}. Requires officer scrutiny.`
      : null;

    const initialStatus = data.isDraft ? FDRStatus.DRAFT : FDRStatus.SUBMITTED;
    const initialVerification = data.isDraft ? VerificationStatus.NOT_SUBMITTED : VerificationStatus.PENDING_VERIFICATION;

    const record = await prisma.$transaction(async (tx) => {
      const fdr = await tx.fDRRecord.create({
        data: {
          institutionId: data.institutionId,
          securityDepositId: data.securityDepositId,
          fdrNumber: data.fdrNumber,
          issuingBank: data.issuingBank,
          bankBranch: data.bankBranch,
          ifscCode: data.ifscCode,
          depositAmount: data.depositAmount,
          currency: data.currency,
          issueDate: data.issueDate,
          maturityDate: data.maturityDate,
          validityDate: data.validityDate,
          jointName: data.jointName || 'Regional Officer, AICTE & Authorized Signatory',
          accountStatus: initialStatus,
          verificationStatus: initialVerification,
          autoRenewal: data.autoRenewal,
          notes: data.notes,
          isPotentialDuplicate,
          duplicateNotes,
          createdById: req.user!.id,
        },
      });

      // If submitted directly, initiate verification case
      if (initialStatus === FDRStatus.SUBMITTED) {
        await tx.verificationCase.create({
          data: {
            fdrId: fdr.id,
            status: 'PENDING',
            outcome: isPotentialDuplicate ? 'DISCREPANCY_DETECTED' : 'PENDING',
          },
        });
      }

      return fdr;
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: initialStatus === FDRStatus.DRAFT ? 'FDR_DRAFT_CREATED' : 'FDR_SUBMITTED',
      resourceType: 'FDR',
      resourceId: record.id,
      details: {
        fdrNumber: data.fdrNumber,
        depositAmount: data.depositAmount,
        isPotentialDuplicate,
      },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    if (initialStatus === FDRStatus.SUBMITTED) {
      await notificationService.notifyRole(UserRole.VERIFICATION_OFFICER, {
        title: 'New FDR Submitted for Verification',
        message: `FDR #${data.fdrNumber} (INR ${data.depositAmount.toLocaleString()}) submitted. ${isPotentialDuplicate ? 'WARNING: Flagged as potential duplicate.' : ''}`,
        type: 'FDR_SUBMITTED',
        priority: isPotentialDuplicate ? 'HIGH' : 'NORMAL',
        relatedResourceId: record.id,
        relatedResourceType: 'FDR',
      });
    }

    return res.status(201).json({
      success: true,
      data: record,
      message: isPotentialDuplicate
        ? 'FDR recorded with potential duplicate flag. Marked for officer scrutiny.'
        : 'FDR created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Submit a Draft FDR
router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const fdr = await prisma.fDRRecord.findUnique({
      where: { id },
      include: { documents: true, institution: true },
    });

    if (!fdr) throw new AppError('FDR Record not found', 404, 'NOT_FOUND');

    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(fdr.institutionId)) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    if (!canTransitionFDR(fdr.accountStatus as FDRStatus, FDRStatus.SUBMITTED)) {
      throw new AppError(`Cannot submit FDR in status '${fdr.accountStatus}'`, 400, 'INVALID_STATUS_TRANSITION');
    }

    // Require at least one uploaded document before official submission
    if (fdr.documents.length === 0) {
      throw new AppError('At least one supporting document (e.g., FDR receipt or bank confirmation letter) must be uploaded before submission', 400, 'DOCUMENT_REQUIRED');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.fDRRecord.update({
        where: { id },
        data: {
          accountStatus: FDRStatus.SUBMITTED,
          verificationStatus: VerificationStatus.PENDING_VERIFICATION,
          updatedById: req.user!.id,
        },
      });

      // Find or create verification case
      const existingCase = await tx.verificationCase.findFirst({ where: { fdrId: id } });
      if (!existingCase) {
        await tx.verificationCase.create({
          data: {
            fdrId: id,
            status: 'PENDING',
            outcome: 'PENDING',
          },
        });
      }

      return rec;
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'FDR_SUBMITTED',
      resourceType: 'FDR',
      resourceId: id,
      details: { fdrNumber: fdr.fdrNumber, previousStatus: fdr.accountStatus },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    await notificationService.notifyRole(UserRole.VERIFICATION_OFFICER, {
      title: 'FDR Submitted for Verification',
      message: `FDR #${fdr.fdrNumber} submitted by ${fdr.institution.name}.`,
      type: 'FDR_SUBMITTED',
      priority: 'NORMAL',
      relatedResourceId: id,
      relatedResourceType: 'FDR',
    });

    return res.json({ success: true, data: updated, message: 'FDR submitted successfully for verification.' });
  } catch (err) {
    next(err);
  }
});

export default router;
