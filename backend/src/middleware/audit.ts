import prisma from '../config/db';
import { logger } from '../utils/logger';

export interface AuditParams {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  correlationId?: string;
}

export async function logAuditEvent(params: AuditParams): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress,
        correlationId: params.correlationId,
      },
    });
  } catch (err: any) {
    logger.error('Failed to persist audit event', { error: err.message, params });
  }
}
