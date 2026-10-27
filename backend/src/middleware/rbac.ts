import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
        },
      });
    }

    next();
  };
}

export function preventAuditorMutation(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === UserRole.AUDITOR && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_AUDITOR_MUTATION',
        message: 'Auditors have strictly read-only permissions and cannot modify records.',
      },
    });
  }
  next();
}
