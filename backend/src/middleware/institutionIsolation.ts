import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';
import prisma from '../config/db';

export async function enforceInstitutionIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  // Super Admin, Verification Officer, Approving Authority, and Auditor have global administrative view
  if ([UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER, UserRole.APPROVING_AUTHORITY, UserRole.AUDITOR].includes(req.user.role)) {
    return next();
  }

  // For Institution users:
  const requestedInstId = req.params.institutionId || req.body?.institutionId || (req.query?.institutionId as string);

  if (requestedInstId) {
    if (!req.user.institutionIds.includes(requestedInstId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSTITUTION_ACCESS_DENIED',
          message: 'You are not authorized to view or modify records belonging to this institution.',
        },
      });
    }
  }

  next();
}

export async function verifyFDRBelongsToUserInstitution(fdrId: string, userInstitutionIds: string[]): Promise<boolean> {
  const fdr = await prisma.fDRRecord.findUnique({
    where: { id: fdrId },
    select: { institutionId: true },
  });
  if (!fdr) return false;
  return userInstitutionIds.includes(fdr.institutionId);
}
