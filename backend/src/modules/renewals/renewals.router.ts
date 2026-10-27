import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { preventAuditorMutation, requireRole } from '../../middleware/rbac';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, FDRStatus } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

const createRenewalSchema = z.object({
  oldFdrId: z.string().uuid(),
  newFdrId: z.string().uuid().optional(),
  reason: z.string().min(5),
});

// Submit Renewal / Replacement Request
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRenewalSchema.parse(req.body);

    const oldFdr = await prisma.fDRRecord.findUnique({
      where: { id: data.oldFdrId },
      include: { institution: true },
    });
    if (!oldFdr) throw new AppError('Previous FDR not found', 404, 'NOT_FOUND');

    // Check institution ownership
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(oldFdr.institutionId)) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    const renewal = await prisma.renewalRequest.create({
      data: {
        oldFdrId: data.oldFdrId,
        newFdrId: data.newFdrId || null,
        institutionId: oldFdr.institutionId,
        reason: data.reason,
        status: 'SUBMITTED',
      },
      include: {
        oldFdr: true,
        newFdr: true,
      },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'RENEWAL_REQUEST_SUBMITTED',
      resourceType: 'RENEWAL',
      resourceId: renewal.id,
      details: { oldFdrId: data.oldFdrId, newFdrId: data.newFdrId, reason: data.reason },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    await notificationService.notifyRole(UserRole.VERIFICATION_OFFICER, {
      title: 'New FDR Renewal/Replacement Submitted',
      message: `Institution ${oldFdr.institution.name} submitted a renewal request for FDR #${oldFdr.fdrNumber}.`,
      type: 'RENEWAL_DUE',
      priority: 'HIGH',
      relatedResourceId: renewal.id,
      relatedResourceType: 'RENEWAL',
    });

    return res.status(201).json({
      success: true,
      data: renewal,
      message: 'Renewal request submitted successfully. Preserves link to previous instrument.',
    });
  } catch (err) {
    next(err);
  }
});

// List renewals
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      where.institutionId = { in: req.user!.institutionIds };
    }

    const renewals = await prisma.renewalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        oldFdr: {
          include: {
            institution: { select: { id: true, name: true, officialIdentifier: true } },
          },
        },
        newFdr: true,
      },
    });

    return res.json({ success: true, data: renewals });
  } catch (err) {
    next(err);
  }
});

// Review and decide Renewal
const reviewRenewalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().min(5),
});

router.post(
  '/:id/review',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, remarks } = reviewRenewalSchema.parse(req.body);

      const renewal = await prisma.renewalRequest.findUnique({
        where: { id },
        include: { oldFdr: true },
      });
      if (!renewal) throw new AppError('Renewal request not found', 404, 'NOT_FOUND');

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.renewalRequest.update({
          where: { id },
          data: {
            status,
            reviewerRemarks: remarks,
          },
        });

        if (status === 'APPROVED') {
          // Transition old FDR to RENEWED
          await tx.fDRRecord.update({
            where: { id: renewal.oldFdrId },
            data: { accountStatus: FDRStatus.RENEWED },
          });

          // If new FDR exists, mark it as approved
          if (renewal.newFdrId) {
            await tx.fDRRecord.update({
              where: { id: renewal.newFdrId },
              data: { accountStatus: FDRStatus.APPROVED },
            });
          }
        }

        return updated;
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'RENEWAL_DECISION_RECORDED',
        resourceType: 'RENEWAL',
        resourceId: id,
        details: { status, remarks },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      await notificationService.notifyInstitutionMembers(renewal.institutionId, {
        title: `FDR Renewal ${status}`,
        message: `Your renewal request for FDR #${renewal.oldFdr.fdrNumber} was ${status}. Remarks: ${remarks}`,
        type: 'RENEWAL_DUE',
        priority: status === 'APPROVED' ? 'HIGH' : 'URGENT',
        relatedResourceId: id,
        relatedResourceType: 'RENEWAL',
      });

      return res.json({ success: true, data: result, message: `Renewal request ${status}.` });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
