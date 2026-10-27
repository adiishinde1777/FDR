import prisma from '../config/db';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { FDRStatus } from '../config/constants';

export class MaturityMonitoringService {
  async runMaturityCheck(): Promise<{ checked: number; alertsCreated: number }> {
    logger.info('Starting scheduled maturity and validity scan...');
    const now = new Date();
    const reminderDays = [30, 15, 7, 0];
    let alertsCreated = 0;

    // Fetch all active/approved FDRs
    const fdrs = await prisma.fDRRecord.findMany({
      where: {
        accountStatus: {
          in: [FDRStatus.APPROVED, FDRStatus.SUBMITTED, FDRStatus.UNDER_REVIEW],
        },
      },
      include: {
        institution: {
          select: { id: true, name: true, officialIdentifier: true },
        },
      },
    });

    for (const fdr of fdrs) {
      const maturityDate = new Date(fdr.maturityDate);
      const diffTime = maturityDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Overdue check
      if (diffDays < 0 && fdr.accountStatus === FDRStatus.APPROVED) {
        // Mark as MATURED if past maturity date
        await prisma.fDRRecord.update({
          where: { id: fdr.id },
          data: { accountStatus: FDRStatus.MATURED },
        });

        // Notify officers and institution
        await notificationService.notifyInstitutionMembers(fdr.institutionId, {
          title: `FDR Matured: ${fdr.fdrNumber}`,
          message: `FDR #${fdr.fdrNumber} for institution ${fdr.institution.name} matured on ${maturityDate.toDateString()}. Renewal or release request is required.`,
          type: 'MATURITY_REMINDER',
          priority: 'URGENT',
          relatedResourceId: fdr.id,
          relatedResourceType: 'FDR',
        });
      }

      // Check configured reminder intervals
      for (const targetDay of reminderDays) {
        if (diffDays <= targetDay && diffDays > targetDay - 2) {
          // Check if reminder was already recorded/sent for this fdr & interval
          const existingJob = await prisma.maturityScheduleJob.findUnique({
            where: {
              fdrId_reminderSentDays: {
                fdrId: fdr.id,
                reminderSentDays: targetDay,
              },
            },
          });

          if (!existingJob) {
            try {
              // Record job execution first (idempotent lock)
              await prisma.maturityScheduleJob.create({
                data: {
                  fdrId: fdr.id,
                  jobType: 'MATURITY_ALERT',
                  reminderSentDays: targetDay,
                  targetDate: maturityDate,
                  status: 'EXECUTED',
                  executedAt: new Date(),
                },
              });

              const urgency = targetDay <= 7 ? 'HIGH' : 'NORMAL';
              const dayText = targetDay === 0 ? 'today' : `in ${targetDay} days`;

              // Send in-app notification to institution
              await notificationService.notifyInstitutionMembers(fdr.institutionId, {
                title: `Upcoming Maturity Alert: FDR #${fdr.fdrNumber}`,
                message: `Fixed Deposit Receipt #${fdr.fdrNumber} (Amount: INR ${fdr.depositAmount.toLocaleString()}) of ${fdr.institution.name} will mature ${dayText} on ${maturityDate.toDateString()}. Please arrange timely renewal.`,
                type: 'MATURITY_REMINDER',
                priority: urgency,
                relatedResourceId: fdr.id,
                relatedResourceType: 'FDR',
              });

              // Also notify Verification & Approving Officers
              await notificationService.notifyRole('VERIFICATION_OFFICER', {
                title: `FDR Maturing Alert: ${fdr.fdrNumber}`,
                message: `FDR #${fdr.fdrNumber} from ${fdr.institution.name} matures ${dayText}.`,
                type: 'MATURITY_REMINDER',
                priority: urgency,
                relatedResourceId: fdr.id,
                relatedResourceType: 'FDR',
              });

              alertsCreated++;
            } catch (jobErr: any) {
              logger.error(`Error dispatching maturity job for FDR ${fdr.id}`, { error: jobErr.message });
            }
          }
        }
      }
    }

    logger.info(`Maturity check completed. Checked ${fdrs.length} records, generated ${alertsCreated} alerts.`);
    return { checked: fdrs.length, alertsCreated };
  }
}

export const maturityMonitoringService = new MaturityMonitoringService();
