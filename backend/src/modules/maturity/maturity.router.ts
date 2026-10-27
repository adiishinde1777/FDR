import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { maturityMonitoringService } from '../../services/maturity.service';
import { UserRole, FDRStatus } from '../../config/constants';

const router = Router();
router.use(requireAuth);

// Get Maturity Calendar / Timeline
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {
      accountStatus: { in: [FDRStatus.APPROVED, FDRStatus.MATURED, FDRStatus.SUBMITTED] },
    };

    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      where.institutionId = { in: req.user!.institutionIds };
    }

    const records = await prisma.fDRRecord.findMany({
      where,
      select: {
        id: true,
        fdrNumber: true,
        issuingBank: true,
        depositAmount: true,
        issueDate: true,
        maturityDate: true,
        accountStatus: true,
        institution: {
          select: { id: true, name: true, officialIdentifier: true },
        },
      },
      orderBy: { maturityDate: 'asc' },
    });

    return res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
});

// Get maturity alerts categorized by urgency
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const where: any = {
      accountStatus: { in: [FDRStatus.APPROVED, FDRStatus.MATURED] },
    };

    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      where.institutionId = { in: req.user!.institutionIds };
    }

    const records = await prisma.fDRRecord.findMany({
      where,
      include: {
        institution: {
          select: { id: true, name: true, officialIdentifier: true },
        },
      },
      orderBy: { maturityDate: 'asc' },
    });

    const categorized = {
      matured: [] as any[],
      urgent7Days: [] as any[],
      warning15Days: [] as any[],
      upcoming30Days: [] as any[],
      future: [] as any[],
    };

    for (const r of records) {
      const diffTime = new Date(r.maturityDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        categorized.matured.push({ ...r, daysRemaining: diffDays });
      } else if (diffDays <= 7) {
        categorized.urgent7Days.push({ ...r, daysRemaining: diffDays });
      } else if (diffDays <= 15) {
        categorized.warning15Days.push({ ...r, daysRemaining: diffDays });
      } else if (diffDays <= 30) {
        categorized.upcoming30Days.push({ ...r, daysRemaining: diffDays });
      } else {
        categorized.future.push({ ...r, daysRemaining: diffDays });
      }
    }

    return res.json({ success: true, data: categorized });
  } catch (err) {
    next(err);
  }
});

// Trigger maturity scan manually (Admin / Officer)
router.post(
  '/trigger-scan',
  requireRole(UserRole.SUPER_ADMIN, UserRole.VERIFICATION_OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await maturityMonitoringService.runMaturityCheck();
      return res.json({
        success: true,
        data: result,
        message: `Maturity check executed: ${result.checked} records evaluated, ${result.alertsCreated} alerts generated.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
