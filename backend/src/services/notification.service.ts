import prisma from '../config/db';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface CreateNotificationDTO {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  relatedResourceId?: string;
  relatedResourceType?: string;
}

export class NotificationService {
  async notifyUser(dto: CreateNotificationDTO) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          priority: dto.priority || 'NORMAL',
          relatedResourceId: dto.relatedResourceId,
          relatedResourceType: dto.relatedResourceType,
          isRead: false,
          emailSent: false,
        },
      });

      // Dispatch simulated/configured email
      if (env.SMTP_ENABLED) {
        logger.info(`[EMAIL DISPATCHED] To: User ${dto.userId} | Subject: ${dto.title}`);
        await prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
      } else {
        logger.debug(`[NOTIFICATION CREATED - In-App] User: ${dto.userId} - ${dto.title}`);
      }

      return notification;
    } catch (err: any) {
      logger.error('Failed to create notification', { error: err.message, dto });
    }
  }

  async notifyRole(role: string, dto: Omit<CreateNotificationDTO, 'userId'>) {
    try {
      const users = await prisma.user.findMany({
        where: { role, isActive: true },
        select: { id: true },
      });

      for (const u of users) {
        await this.notifyUser({ ...dto, userId: u.id });
      }
    } catch (err: any) {
      logger.error(`Failed to broadcast notification to role ${role}`, { error: err.message });
    }
  }

  async notifyInstitutionMembers(institutionId: string, dto: Omit<CreateNotificationDTO, 'userId'>) {
    try {
      const memberships = await prisma.institutionMembership.findMany({
        where: { institutionId },
        select: { userId: true },
      });

      for (const m of memberships) {
        await this.notifyUser({ ...dto, userId: m.userId });
      }
    } catch (err: any) {
      logger.error(`Failed to notify institution ${institutionId} members`, { error: err.message });
    }
  }
}

export const notificationService = new NotificationService();
