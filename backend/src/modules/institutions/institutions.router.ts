import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole, preventAuditorMutation } from '../../middleware/rbac';
import { enforceInstitutionIsolation } from '../../middleware/institutionIsolation';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, InstitutionStatus } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

router.use(requireAuth);
router.use(preventAuditorMutation);

// List institutions (Super Admin, Officers, Auditors)
router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER, UserRole.APPROVING_AUTHORITY, UserRole.AUDITOR), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, state, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { officialIdentifier: { contains: String(search) } },
        { contactEmail: { contains: String(search) } },
      ];
    }
    if (state) where.state = String(state);
    if (status) where.accountStatus = String(status);

    const [institutions, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { fdrs: true, securityDeposits: true, memberships: true },
          },
        },
      }),
      prisma.institution.count({ where }),
    ]);

    return res.json({
      success: true,
      data: institutions,
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

// Get single institution
router.get('/:institutionId', enforceInstitutionIsolation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { institutionId } = req.params;

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        securityDeposits: {
          include: {
            fdrs: {
              select: {
                id: true,
                fdrNumber: true,
                issuingBank: true,
                depositAmount: true,
                accountStatus: true,
                maturityDate: true,
              },
            },
          },
        },
        memberships: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true, phone: true, isActive: true },
            },
          },
        },
        _count: {
          select: { fdrs: true, documents: true, releaseRequests: true },
        },
      },
    });

    if (!institution) {
      throw new AppError('Institution not found', 404, 'NOT_FOUND');
    }

    return res.json({ success: true, data: institution });
  } catch (err) {
    next(err);
  }
});

// Update Institution Status (Approve/Reject Registration) - Super Admin only
const statusUpdateSchema = z.object({
  status: z.enum([InstitutionStatus.ACTIVE, InstitutionStatus.REJECTED, InstitutionStatus.SUSPENDED]),
  remarks: z.string().optional(),
});

router.patch('/:institutionId/status', requireRole(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { institutionId } = req.params;
    const { status, remarks } = statusUpdateSchema.parse(req.body);

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) throw new AppError('Institution not found', 404, 'NOT_FOUND');

    const updated = await prisma.institution.update({
      where: { id: institutionId },
      data: { accountStatus: status },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'INSTITUTION_STATUS_UPDATE',
      resourceType: 'INSTITUTION',
      resourceId: institutionId,
      details: { previousStatus: institution.accountStatus, newStatus: status, remarks },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    // Notify institution users
    await notificationService.notifyInstitutionMembers(institutionId, {
      title: `Institution Account ${status === InstitutionStatus.ACTIVE ? 'Approved' : 'Status Updated'}`,
      message: `Your institution account for ${institution.name} has been set to ${status}. ${remarks ? `Remarks: ${remarks}` : ''}`,
      type: 'APPROVAL_UPDATE',
      priority: status === InstitutionStatus.ACTIVE ? 'HIGH' : 'URGENT',
      relatedResourceId: institutionId,
      relatedResourceType: 'INSTITUTION',
    });

    return res.json({ success: true, data: updated, message: `Institution status updated to ${status}` });
  } catch (err) {
    next(err);
  }
});

// Create Security Deposit for an Institution
const createDepositSchema = z.object({
  depositReference: z.string().min(3),
  programCategory: z.string().min(2),
  requiredAmount: z.number().positive(),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
});

router.post('/:institutionId/security-deposits', requireRole(UserRole.SUPER_ADMIN, UserRole.APPROVING_AUTHORITY), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { institutionId } = req.params;
    const data = createDepositSchema.parse(req.body);

    const existing = await prisma.securityDeposit.findUnique({
      where: { depositReference: data.depositReference },
    });
    if (existing) {
      throw new AppError(`Deposit reference ${data.depositReference} already exists`, 400, 'DUPLICATE_REFERENCE');
    }

    const deposit = await prisma.securityDeposit.create({
      data: {
        institutionId,
        depositReference: data.depositReference,
        programCategory: data.programCategory,
        requiredAmount: data.requiredAmount,
        currency: data.currency,
        notes: data.notes,
        status: 'ACTIVE',
      },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'SECURITY_DEPOSIT_CREATE',
      resourceType: 'SECURITY_DEPOSIT',
      resourceId: deposit.id,
      details: { depositReference: data.depositReference, requiredAmount: data.requiredAmount },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.status(201).json({ success: true, data: deposit });
  } catch (err) {
    next(err);
  }
});

export default router;
