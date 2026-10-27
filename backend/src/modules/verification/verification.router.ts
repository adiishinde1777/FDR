import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole, preventAuditorMutation } from '../../middleware/rbac';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, FDRStatus, VerificationStatus } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

// Verification Queue (Officers, Approvers, Admin, Auditor)
router.get(
  '/queue',
  requireRole(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER, UserRole.APPROVING_AUTHORITY, UserRole.AUDITOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, assignedToMe, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status) where.status = String(status);
      if (assignedToMe === 'true' && req.user!.role === UserRole.VERIFICATION_OFFICER) {
        where.assignedOfficerId = req.user!.id;
      }

      const [cases, total] = await Promise.all([
        prisma.verificationCase.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            fdr: {
              include: {
                institution: {
                  select: { id: true, name: true, officialIdentifier: true, state: true },
                },
                _count: {
                  select: { documents: true },
                },
              },
            },
            assignedOfficer: {
              select: { id: true, fullName: true, email: true },
            },
            _count: {
              select: { observations: true },
            },
          },
        }),
        prisma.verificationCase.count({ where }),
      ]);

      return res.json({
        success: true,
        data: cases,
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
  }
);

// Get Verification Case Detail
router.get(
  '/:caseId',
  requireRole(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER, UserRole.APPROVING_AUTHORITY, UserRole.AUDITOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;

      const vCase = await prisma.verificationCase.findUnique({
        where: { id: caseId },
        include: {
          fdr: {
            include: {
              institution: true,
              securityDeposit: true,
              documents: {
                include: { ocrResult: true },
              },
            },
          },
          assignedOfficer: {
            select: { id: true, fullName: true, email: true },
          },
          observations: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!vCase) throw new AppError('Verification case not found', 404, 'NOT_FOUND');

      return res.json({ success: true, data: vCase });
    } catch (err) {
      next(err);
    }
  }
);

// Assign case to an officer
const assignSchema = z.object({
  officerId: z.string().uuid(),
});

router.post(
  '/:caseId/assign',
  requireRole(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { officerId } = assignSchema.parse(req.body);

      const officer = await prisma.user.findUnique({ where: { id: officerId } });
      if (!officer || officer.role !== UserRole.VERIFICATION_OFFICER) {
        throw new AppError('Assigned user must be an active Verification Officer', 400, 'INVALID_OFFICER');
      }

      const updated = await prisma.verificationCase.update({
        where: { id: caseId },
        data: {
          assignedOfficerId: officerId,
          status: 'IN_PROGRESS',
        },
        include: { fdr: true },
      });

      // Update FDR status to UNDER_REVIEW
      await prisma.fDRRecord.update({
        where: { id: updated.fdrId },
        data: {
          accountStatus: FDRStatus.UNDER_REVIEW,
          verificationStatus: VerificationStatus.UNDER_REVIEW,
        },
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'VERIFICATION_CASE_ASSIGNED',
        resourceType: 'VERIFICATION',
        resourceId: caseId,
        details: { assignedOfficerId: officerId, officerName: officer.fullName },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      await notificationService.notifyUser({
        userId: officerId,
        title: 'New Verification Case Assigned',
        message: `FDR #${updated.fdr.fdrNumber} has been assigned to you for verification.`,
        type: 'VERIFICATION_ASSIGNED',
        priority: 'HIGH',
        relatedResourceId: caseId,
        relatedResourceType: 'VERIFICATION',
      });

      return res.json({ success: true, data: updated, message: 'Case assigned successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// Record verification observation / Flag discrepancy
const observationSchema = z.object({
  observationType: z.enum([
    'DATA_MISMATCH',
    'DOCUMENT_ILLEGIBLE',
    'BANK_BRANCH_DISCREPANCY',
    'AMOUNT_MISMATCH',
    'DATE_ERROR',
    'GENERAL_NOTE',
  ]),
  fieldName: z.string().optional(),
  enteredValue: z.string().optional(),
  observedValue: z.string().optional(),
  remarks: z.string().min(5),
});

router.post(
  '/:caseId/observations',
  requireRole(UserRole.VERIFICATION_OFFICER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const data = observationSchema.parse(req.body);

      const vCase = await prisma.verificationCase.findUnique({
        where: { id: caseId },
        include: { fdr: { include: { institution: true } } },
      });
      if (!vCase) throw new AppError('Verification case not found', 404, 'NOT_FOUND');

      const isDiscrepancy = data.observationType !== 'GENERAL_NOTE';

      const observation = await prisma.$transaction(async (tx) => {
        const obs = await tx.verificationObservation.create({
          data: {
            caseId,
            officerId: req.user!.id,
            observationType: data.observationType,
            fieldName: data.fieldName,
            enteredValue: data.enteredValue,
            observedValue: data.observedValue,
            remarks: data.remarks,
          },
        });

        if (isDiscrepancy) {
          await tx.verificationCase.update({
            where: { id: caseId },
            data: {
              status: 'ADDITIONAL_INFO_REQUESTED',
              outcome: 'DISCREPANCY_DETECTED',
            },
          });

          await tx.fDRRecord.update({
            where: { id: vCase.fdrId },
            data: {
              accountStatus: FDRStatus.DISCREPANT,
              verificationStatus: VerificationStatus.DISCREPANCY_FOUND,
            },
          });
        }

        return obs;
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'VERIFICATION_OBSERVATION_RECORDED',
        resourceType: 'VERIFICATION',
        resourceId: caseId,
        details: { observationType: data.observationType, remarks: data.remarks },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      if (isDiscrepancy) {
        // Notify institution of discrepancy
        await notificationService.notifyInstitutionMembers(vCase.fdr.institutionId, {
          title: `Discrepancy Flagged: FDR #${vCase.fdr.fdrNumber}`,
          message: `Verification officer recorded a discrepancy (${data.observationType}): ${data.remarks}. Corrective action or response required.`,
          type: 'DISCREPANCY_FLAGGED',
          priority: 'URGENT',
          relatedResourceId: vCase.fdrId,
          relatedResourceType: 'FDR',
        });
      }

      return res.status(201).json({
        success: true,
        data: observation,
        message: isDiscrepancy ? 'Discrepancy flagged and institution notified.' : 'Observation recorded.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Record external bank verification reference
const recordExternalSchema = z.object({
  verificationType: z.enum(['MANUAL_DOCUMENT_CHECK', 'BANK_LETTER_VERIFIED', 'BANK_API_CONFIRMED', 'NOT_APPLICABLE']),
  verificationReference: z.string().min(3),
  notes: z.string().optional(),
});

router.post(
  '/:caseId/record-external',
  requireRole(UserRole.VERIFICATION_OFFICER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const data = recordExternalSchema.parse(req.body);

      const vCase = await prisma.verificationCase.update({
        where: { id: caseId },
        data: {
          externalVerificationType: data.verificationType,
          externalVerificationReference: data.verificationReference,
          externalVerificationNotes: data.notes,
        },
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'EXTERNAL_VERIFICATION_RECORDED',
        resourceType: 'VERIFICATION',
        resourceId: caseId,
        details: data,
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      return res.json({
        success: true,
        data: vCase,
        message: 'External verification reference recorded accurately.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Complete verification (Recommend for Approval or Reject)
const completeVerificationSchema = z.object({
  outcome: z.enum(['RECOMMENDED_APPROVAL', 'RECOMMENDED_REJECTION']),
  remarks: z.string().min(5),
});

router.post(
  '/:caseId/complete',
  requireRole(UserRole.VERIFICATION_OFFICER, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { outcome, remarks } = completeVerificationSchema.parse(req.body);

      const vCase = await prisma.verificationCase.findUnique({
        where: { id: caseId },
        include: { fdr: { include: { institution: true } } },
      });
      if (!vCase) throw new AppError('Verification case not found', 404, 'NOT_FOUND');

      const isRecommended = outcome === 'RECOMMENDED_APPROVAL';

      const result = await prisma.$transaction(async (tx) => {
        const updatedCase = await tx.verificationCase.update({
          where: { id: caseId },
          data: {
            status: 'COMPLETED',
            outcome,
          },
        });

        // Update FDR status
        await tx.fDRRecord.update({
          where: { id: vCase.fdrId },
          data: {
            accountStatus: isRecommended ? FDRStatus.VERIFIED : FDRStatus.REJECTED,
            verificationStatus: isRecommended
              ? VerificationStatus.READY_FOR_APPROVAL
              : VerificationStatus.VERIFICATION_FAILED,
          },
        });

        // If recommended for approval, create ApprovalCase
        let approvalCase = null;
        if (isRecommended) {
          approvalCase = await tx.approvalCase.create({
            data: {
              fdrId: vCase.fdrId,
              stage: 'STAGE_1_SCRUTINY',
              status: 'PENDING',
              currentApproverRole: UserRole.APPROVING_AUTHORITY,
            },
          });
        }

        return { updatedCase, approvalCase };
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'VERIFICATION_COMPLETED',
        resourceType: 'VERIFICATION',
        resourceId: caseId,
        details: { outcome, remarks },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      // Notify Approving Authorities if ready for approval
      if (isRecommended) {
        await notificationService.notifyRole(UserRole.APPROVING_AUTHORITY, {
          title: 'FDR Verified - Awaiting Official Approval',
          message: `FDR #${vCase.fdr.fdrNumber} (${vCase.fdr.institution.name}) passed scrutiny and is in your approval queue.`,
          type: 'APPROVAL_UPDATE',
          priority: 'HIGH',
          relatedResourceId: vCase.fdrId,
          relatedResourceType: 'FDR',
        });
      }

      return res.json({
        success: true,
        data: result,
        message: isRecommended
          ? 'Verification completed. FDR routed to Approving Authority queue.'
          : 'Verification marked as failed. FDR rejected.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
