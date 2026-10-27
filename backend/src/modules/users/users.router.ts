import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { hashPassword } from '../../utils/crypto';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole } from '../../config/constants';

const router = Router();
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN));

// List users
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search } = req.query;
    const where: any = {};
    if (role) where.role = String(role);
    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { fullName: { contains: String(search) } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          include: {
            institution: { select: { id: true, name: true, officialIdentifier: true } },
          },
        },
      },
    });

    return res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  institutionId: z.string().uuid().optional(),
});

// Admin user provisioning
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new AppError('A user with this email already exists', 400, 'EMAIL_EXISTS');

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
          role: data.role,
          phone: data.phone,
          isActive: true,
        },
      });

      if (data.institutionId) {
        await tx.institutionMembership.create({
          data: {
            userId: u.id,
            institutionId: data.institutionId,
            roleInInst: 'ADMIN',
          },
        });
      }

      return u;
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_PROVISIONED',
      resourceType: 'USER',
      resourceId: user.id,
      details: { email: user.email, role: user.role, institutionId: data.institutionId },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      message: 'User provisioned successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Toggle User Active Status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'USER_STATUS_TOGGLED',
      resourceType: 'USER',
      resourceId: id,
      details: { previous: user.isActive, updated: updated.isActive },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.json({ success: true, data: updated, message: `User status updated to ${updated.isActive ? 'Active' : 'Deactivated'}` });
  } catch (err) {
    next(err);
  }
});

export default router;
