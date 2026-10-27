import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { UserRole, FDRStatus } from '../../config/constants';

const router = Router();
router.use(requireAuth);

router.get('/dashboard-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user!.role;
    const isInstUser = [UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(role);
    const instIds = req.user!.institutionIds;

    const fdrWhere: any = {};
    if (isInstUser) {
      fdrWhere.institutionId = { in: instIds };
    }

    const [
      totalFdrs,
      fdrs,
      totalInstitutions,
      pendingVerifications,
      discrepancies,
      pendingApprovals,
      releaseRequestsCount,
      renewalsCount,
    ] = await Promise.all([
      prisma.fDRRecord.count({ where: fdrWhere }),
      prisma.fDRRecord.findMany({
        where: fdrWhere,
        select: {
          id: true,
          depositAmount: true,
          accountStatus: true,
          issuingBank: true,
          maturityDate: true,
          createdAt: true,
        },
      }),
      isInstUser ? Promise.resolve(instIds.length) : prisma.institution.count(),
      prisma.verificationCase.count({ where: { status: 'PENDING' } }),
      prisma.fDRRecord.count({ where: { ...fdrWhere, accountStatus: FDRStatus.DISCREPANT } }),
      prisma.approvalCase.count({ where: { status: 'PENDING' } }),
      prisma.releaseRefundRequest.count({
        where: isInstUser ? { institutionId: { in: instIds } } : {},
      }),
      prisma.renewalRequest.count({
        where: isInstUser ? { institutionId: { in: instIds } } : {},
      }),
    ]);

    // Calculate total active amount
    const totalAmount = fdrs.reduce((acc, curr) => acc + curr.depositAmount, 0);
    const approvedAmount = fdrs
      .filter((f) => [FDRStatus.APPROVED, FDRStatus.MATURED].includes(f.accountStatus as FDRStatus))
      .reduce((acc, curr) => acc + curr.depositAmount, 0);

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const f of fdrs) {
      statusCounts[f.accountStatus] = (statusCounts[f.accountStatus] || 0) + 1;
    }

    // Bank distribution
    const bankCounts: Record<string, number> = {};
    for (const f of fdrs) {
      bankCounts[f.issuingBank] = (bankCounts[f.issuingBank] || 0) + 1;
    }

    // Upcoming maturities within 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingMaturityCount = fdrs.filter((f) => {
      const mat = new Date(f.maturityDate);
      return mat >= now && mat <= thirtyDaysFromNow && f.accountStatus === FDRStatus.APPROVED;
    }).length;

    return res.json({
      success: true,
      data: {
        totalFdrs,
        totalAmount,
        approvedAmount,
        totalInstitutions,
        pendingVerifications,
        discrepancies,
        pendingApprovals,
        upcomingMaturityCount,
        releaseRequestsCount,
        renewalsCount,
        statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        bankDistribution: Object.entries(bankCounts).map(([bank, count]) => ({ bank, count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Export FDRs to CSV
router.get('/export-csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isInstUser = [UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role);
    const where: any = {};
    if (isInstUser) where.institutionId = { in: req.user!.institutionIds };

    const fdrs = await prisma.fDRRecord.findMany({
      where,
      include: {
        institution: { select: { name: true, officialIdentifier: true, state: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Institution Name',
      'AICTE ID',
      'State',
      'FDR Number',
      'Issuing Bank',
      'Branch',
      'Deposit Amount (INR)',
      'Issue Date',
      'Maturity Date',
      'Account Status',
      'Verification Status',
    ];

    const rows = fdrs.map((f) => [
      `"${f.institution.name.replace(/"/g, '""')}"`,
      `"${f.institution.officialIdentifier}"`,
      `"${f.institution.state}"`,
      `"${f.fdrNumber}"`,
      `"${f.issuingBank}"`,
      `"${f.bankBranch}"`,
      f.depositAmount.toFixed(2),
      f.issueDate.toISOString().slice(0, 10),
      f.maturityDate.toISOString().slice(0, 10),
      f.accountStatus,
      f.verificationStatus,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aicte_fdr_report_${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

export default router;
