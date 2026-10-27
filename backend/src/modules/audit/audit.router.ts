import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '../../config/constants';

const router = Router();
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.AUDITOR));

// Append-only audit logs query
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resourceType, action, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (resourceType) where.resourceType = String(resourceType);
    if (action) where.action = String(action);
    if (search) {
      where.OR = [
        { actorEmail: { contains: String(search) } },
        { action: { contains: String(search) } },
        { details: { contains: String(search) } },
        { resourceId: { contains: String(search) } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return res.json({
      success: true,
      data: logs,
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

export default router;
