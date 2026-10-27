import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole, preventAuditorMutation } from '../../middleware/rbac';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, FDRStatus, ApprovalDecisionType } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

// Approval Queue
router.get(
  '/queue',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN, UserRole.AUDITOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status = 'PENDING', page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status) where.status = String(status);

      const [cases, total] = await Promise.all([
        prisma.approvalCase.findMany({
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
                securityDeposit: {
                  select: { id: true, depositReference: true, programCategory: true },
                },
                _count: {
                  select: { documents: true },
                },
              },
            },
            decisions: {
              include: {
                approver: {
                  select: { id: true, fullName: true, role: true },
                },
              },
            },
          },
        }),
        prisma.approvalCase.count({ where }),
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

// Get single approval case
router.get(
  '/:caseId',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN, UserRole.AUDITOR),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;

      const aCase = await prisma.approvalCase.findUnique({
        where: { id: caseId },
        include: {
          fdr: {
            include: {
              institution: true,
              securityDeposit: true,
              documents: { include: { ocrResult: true } },
              verificationCases: {
                include: {
                  observations: true,
                  assignedOfficer: { select: { id: true, fullName: true } },
                },
              },
            },
          },
          decisions: {
            orderBy: { createdAt: 'desc' },
            include: {
              approver: { select: { id: true, fullName: true, role: true, email: true } },
            },
          },
        },
      });

      if (!aCase) throw new AppError('Approval case not found', 404, 'NOT_FOUND');

      return res.json({ success: true, data: aCase });
    } catch (err) {
      next(err);
    }
  }
);

const decisionSchema = z.object({
  decision: z.enum([
    ApprovalDecisionType.APPROVED,
    ApprovalDecisionType.REJECTED,
    ApprovalDecisionType.RETURNED_FOR_CORRECTION,
  ]),
  remarks: z.string().min(5),
  reason: z.string().optional(),
});

// Record Approval Decision
router.post(
  '/:caseId/decision',
  requireRole(UserRole.APPROVING_AUTHORITY, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { caseId } = req.params;
      const { decision, remarks, reason } = decisionSchema.parse(req.body);

      const aCase = await prisma.approvalCase.findUnique({
        where: { id: caseId },
        include: { fdr: { include: { institution: true } } },
      });

      if (!aCase) throw new AppError('Approval case not found', 404, 'NOT_FOUND');

      // Map decision to new FDR status
      let newFdrStatus: FDRStatus;
      if (decision === ApprovalDecisionType.APPROVED) {
        newFdrStatus = FDRStatus.APPROVED;
      } else if (decision === ApprovalDecisionType.REJECTED) {
        newFdrStatus = FDRStatus.REJECTED;
      } else {
        newFdrStatus = FDRStatus.RETURNED_FOR_CORRECTION;
      }

      // Execute atomic transaction for financial approval
      const result = await prisma.$transaction(async (tx) => {
        // Record decision in history
        const dec = await tx.approvalDecision.create({
          data: {
            caseId,
            approverId: req.user!.id,
            decision,
            previousStatus: aCase.fdr.accountStatus,
            newStatus: newFdrStatus,
            remarks,
            reason,
          },
        });

        // Update approval case
        await tx.approvalCase.update({
          where: { id: caseId },
          data: {
            status: decision === ApprovalDecisionType.APPROVED ? 'APPROVED' : decision === ApprovalDecisionType.REJECTED ? 'REJECTED' : 'RETURNED',
          },
        });

        // Update FDR record
        const updatedFdr = await tx.fDRRecord.update({
          where: { id: aCase.fdrId },
          data: {
            accountStatus: newFdrStatus,
            updatedById: req.user!.id,
          },
        });

        return { dec, updatedFdr };
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'APPROVAL_DECISION_RECORDED',
        resourceType: 'APPROVAL',
        resourceId: caseId,
        details: { decision, previousStatus: aCase.fdr.accountStatus, newStatus: newFdrStatus, remarks, reason },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      // Notify institution of final decision
      const notifType = decision === ApprovalDecisionType.APPROVED ? 'APPROVAL_UPDATE' : 'DISCREPANCY_FLAGGED';
      const priority = decision === ApprovalDecisionType.APPROVED ? 'HIGH' : 'URGENT';

      await notificationService.notifyInstitutionMembers(aCase.fdr.institutionId, {
        title: `FDR #${aCase.fdr.fdrNumber} Decision: ${decision}`,
        message: `Your FDR #${aCase.fdr.fdrNumber} (INR ${aCase.fdr.depositAmount.toLocaleString()}) has been ${decision} by the Competent AICTE Approving Authority. Remarks: ${remarks}`,
        type: notifType,
        priority,
        relatedResourceId: aCase.fdrId,
        relatedResourceType: 'FDR',
      });

      return res.json({
        success: true,
        data: result,
        message: `Decision recorded: FDR marked as ${decision}.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
