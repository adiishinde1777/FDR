import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/db';
import { hashPassword, verifyPassword, generateToken } from '../../utils/crypto';
import { createSession, revokeSession, requireAuth } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, InstitutionStatus } from '../../config/constants';
import { notificationService } from '../../services/notification.service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            institution: {
              select: { id: true, name: true, officialIdentifier: true, accountStatus: true },
            },
          },
        },
      },
    });

    if (!user) {
      await logAuditEvent({
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'AUTH',
        details: { email, reason: 'USER_NOT_FOUND' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'AUTH_LOGIN_BLOCKED',
        resourceType: 'AUTH',
        details: { reason: 'ACCOUNT_DEACTIVATED' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw new AppError('Your account has been deactivated. Please contact the administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'AUTH',
        details: { reason: 'PASSWORD_MISMATCH' },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });
      throw new AppError('Invalid email or password credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = createSession(user.id);

    // Set secure HttpOnly SameSite cookie
    res.cookie('aicte_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.json({
      success: true,
      data: {
        token, // also return token for API/test convenience
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          institutions: user.memberships.map((m) => m.institution),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.['aicte_session'] || req.headers.authorization?.slice(7);
    if (token) {
      revokeSession(token);
    }
    res.clearCookie('aicte_session');

    await logAuditEvent({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'AUTH_LOGOUT',
      resourceType: 'AUTH',
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: {
            institution: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        institutions: user.memberships.map((m) => m.institution),
      },
    });
  } catch (err) {
    next(err);
  }
});

const registerInstSchema = z.object({
  officialIdentifier: z.string().min(3),
  name: z.string().min(3),
  address: z.string().min(5),
  state: z.string().min(2),
  district: z.string().min(2),
  pinCode: z.string().min(5),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  approvalReference: z.string().min(3),
  adminFullName: z.string().min(3),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

// Institution Registration Request (Created as PENDING_APPROVAL)
router.post('/register-institution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerInstSchema.parse(req.body);

    // Check unique identifier
    const existing = await prisma.institution.findUnique({
      where: { officialIdentifier: data.officialIdentifier },
    });
    if (existing) {
      throw new AppError(`An institution with identifier ${data.officialIdentifier} is already registered`, 400, 'IDENTIFIER_EXISTS');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail.toLowerCase() },
    });
    if (existingUser) {
      throw new AppError(`A user with email ${data.adminEmail} already exists`, 400, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(data.adminPassword);

    // Run transaction: create user, institution in PENDING_APPROVAL, link membership
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.adminEmail.toLowerCase(),
          passwordHash,
          fullName: data.adminFullName,
          role: UserRole.INSTITUTION_ADMIN,
          phone: data.contactPhone,
          isActive: true,
        },
      });

      const institution = await tx.institution.create({
        data: {
          officialIdentifier: data.officialIdentifier,
          name: data.name,
          address: data.address,
          state: data.state,
          district: data.district,
          pinCode: data.pinCode,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          approvalReference: data.approvalReference,
          accountStatus: InstitutionStatus.PENDING_APPROVAL,
        },
      });

      await tx.institutionMembership.create({
        data: {
          userId: user.id,
          institutionId: institution.id,
          roleInInst: 'ADMIN',
        },
      });

      return { user, institution };
    });

    // Notify Super Admin
    await notificationService.notifyRole(UserRole.SUPER_ADMIN, {
      title: 'New Institution Registration Request',
      message: `${data.name} (${data.officialIdentifier}) has submitted an onboarding request for administrative review.`,
      type: 'REGISTRATION_REQUEST',
      priority: 'HIGH',
      relatedResourceId: result.institution.id,
      relatedResourceType: 'INSTITUTION',
    });

    await logAuditEvent({
      actorId: result.user.id,
      actorEmail: result.user.email,
      actorRole: UserRole.INSTITUTION_ADMIN,
      action: 'INSTITUTION_REGISTRATION_SUBMITTED',
      resourceType: 'INSTITUTION',
      resourceId: result.institution.id,
      details: { identifier: data.officialIdentifier, name: data.name },
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.status(201).json({
      success: true,
      message: 'Institution registration request submitted successfully. It will remain pending until approved by an AICTE Super Administrator.',
      data: {
        institutionId: result.institution.id,
        officialIdentifier: result.institution.officialIdentifier,
        status: result.institution.accountStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
