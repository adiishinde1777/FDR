import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { env } from '../config/env';
import { UserRole } from '../config/constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  institutionIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// In-memory / cache session registry for instant invalidation
export const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  activeSessions.set(token, { userId, expiresAt });
  return token;
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.['aicte_session'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      return next();
    }

    const session = activeSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) activeSessions.delete(token);
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          select: { institutionId: true },
        },
      },
    });

    if (!user || !user.isActive) {
      activeSessions.delete(token);
      return next();
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
      institutionIds: user.memberships.map((m) => m.institutionId),
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required to access this resource.',
      },
    });
  }
  next();
}
