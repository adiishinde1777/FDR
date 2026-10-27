import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { preventAuditorMutation, requireRole } from '../../middleware/rbac';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, FDRStatus, ReleaseRequestStatus } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

const createReleaseSchema = z.object({
  institutionId: z.string().uuid(),
  securityDepositId: z.string().uuid(),
  fdrId: z.string().uuid(),
  requestType: z.enum(['FULL_RELEASE', 'PARTIAL_RELEASE', 'SURRENDER', 'REFUND']),
  requestedAmount: z.number().positive(),
  reason: z.string().min(10),
  conditionChecklist: z.array(z.string()).min(1),
});

// Submit Release / Refund Request
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReleaseSchema.parse(req.body);

    // Verify institution authorization
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(data.institutionId)) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    const fdr = await prisma.fDRRecord.findUnique({
      where: { id: data.fdrId },
      include: { institution: true },
    });
    if (!fdr) throw new AppError('FDR Record not found', 404, 'NOT_FOUND');

    if (![FDRStatus.APPROVED, FDRStatus.MATURED].includes(fdr.accountStatus as FDRStatus)) {
      throw new AppError('Release requests can only be initiated for Approved or Matured FDRs', 400, 'INVALID_FDR_STATUS');
    }

    const requestNumber = `REL-AICTE-${Date.now().toString().slice(-6)}`;

    const release = await prisma.releaseRefundRequest.create({
      data: {
        requestNumber,
        institutionId: data.institutionId,
        securityDepositId: data.securityDepositId,
        fdrId: data.fdrId,
        requestType: data.requestType,
        requestedAmount: data.requestedAmount,
        reason: data.reason,
        conditionChecklist: JSON.stringify(data.conditionChecklist),
        status: ReleaseRequestStatus.SUBMITTED,
      },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'RELEASE_REQUEST_SUBMITTED',
      resourceType: 'RELEASE',
      resourceId: release.id,
      details: { requestNumber, requestedAmount: data.requestedAmount, fdrId: data.fdrId },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    await notificationService.notifyRole(UserRole.APPROVING_AUTHORITY, {
      title: 'New Security Deposit Release Request',
      message: `${fdr.institution.name} submitted release request #${requestNumber} for FDR #${fdr.fdrNumber} (INR ${data.requestedAmount.toLocaleString()}).`,
      type: 'RELEASE_UPDATE',
      priority: 'HIGH',
      relatedResourceId: release.id,
      relatedResourceType: 'RELEASE',
    });

    return res.status(201).json({
      success: true,
      data: release,
      message: 'Release/refund request submitted successfully for administrative review.',
    });
  } catch (err) {
    next(err);
  }
});

// List release requests
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      where.institutionId = { in: req.user!.institutionIds };
    }

    const requests = await prisma.releaseRefundRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        institution: { select: { id: true, name: true, officialIdentifier: true } },
        securityDeposit: { select: { id: true, depositReference: true } },
        fdr: { select: { id: true, fdrNumber: true, depositAmount: true, issuingBank: true } },
      },
    });

    return res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});

// Approve or Reject Release Request (Approving Authority only)
const decideReleaseSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'ADDITIONAL_INFO_REQUIRED']),
  remarks: z.string().min(5),
});

router.post(
  '/:id/decision',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { decision, remarks } = decideReleaseSchema.parse(req.body);

      const request = await prisma.releaseRefundRequest.findUnique({
        where: { id },
        include: { institution: true, fdr: true },
      });
      if (!request) throw new AppError('Release request not found', 404, 'NOT_FOUND');

      let newStatus: string;
      if (decision === 'APPROVED') newStatus = ReleaseRequestStatus.APPROVED;
      else if (decision === 'REJECTED') newStatus = ReleaseRequestStatus.REJECTED;
      else newStatus = ReleaseRequestStatus.ADDITIONAL_INFO_REQUIRED;

      const updated = await prisma.releaseRefundRequest.update({
        where: { id },
        data: {
          status: newStatus,
          decisionRemarks: remarks,
          decidedById: req.user!.id,
        },
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'RELEASE_DECISION_RECORDED',
        resourceType: 'RELEASE',
        resourceId: id,
        details: { decision, remarks },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      await notificationService.notifyInstitutionMembers(request.institutionId, {
        title: `Release Request #${request.requestNumber} ${decision}`,
        message: `Your release request for FDR #${request.fdr.fdrNumber} was marked as ${decision}. Remarks: ${remarks}`,
        type: 'RELEASE_UPDATE',
        priority: decision === 'APPROVED' ? 'HIGH' : 'URGENT',
        relatedResourceId: id,
        relatedResourceType: 'RELEASE',
      });

      return res.json({ success: true, data: updated, message: `Release request ${decision}.` });
    } catch (err) {
      next(err);
    }
  }
);

// Record External Settlement Reference (UTR / Bank Payment Order)
const settlementSchema = z.object({
  externalSettlementReference: z.string().min(3),
  decisionRemarks: z.string().optional(),
});

router.post(
  '/:id/settlement',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { externalSettlementReference, decisionRemarks } = settlementSchema.parse(req.body);

      const updated = await prisma.$transaction(async (tx) => {
        const reqDoc = await tx.releaseRefundRequest.update({
          where: { id },
          data: {
            externalSettlementReference,
            decisionRemarks,
            status: ReleaseRequestStatus.SETTLED_EXTERNAL,
            closedAt: new Date(),
          },
        });

        // Transition FDR to RELEASED
        await tx.fDRRecord.update({
          where: { id: reqDoc.fdrId },
          data: { accountStatus: FDRStatus.RELEASED },
        });

        return reqDoc;
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'RELEASE_SETTLEMENT_RECORDED',
        resourceType: 'RELEASE',
        resourceId: id,
        details: { externalSettlementReference, note: 'External bank settlement reference recorded without claiming automated transfer' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      return res.json({
        success: true,
        data: updated,
        message: 'External settlement reference recorded and FDR successfully marked as Released.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
