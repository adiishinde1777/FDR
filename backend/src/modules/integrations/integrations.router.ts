import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';

const router = Router();
router.use(requireAuth);

router.get('/status', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      bankVerificationApi: {
        enabled: env.BANK_VERIFICATION_API_ENABLED,
        status: env.BANK_VERIFICATION_API_ENABLED ? 'CONNECTED' : 'UNAVAILABLE_MANUAL_WORKFLOW_ACTIVE',
        description: env.BANK_VERIFICATION_API_ENABLED
          ? 'Connected to authorized bank verification network'
          : 'External bank API is unconfigured. Manual document verification and bank confirmation letter workflows are active.',
        mode: 'MANUAL_OFFICER_REVIEW',
      },
      aicteCentralPortal: {
        enabled: env.AICTE_PORTAL_API_ENABLED,
        status: env.AICTE_PORTAL_API_ENABLED ? 'SYNCED' : 'STANDALONE_SECURE_MODE',
        description: 'AICTE Security Deposit and FDR records managed securely within local persistent database.',
      },
      ocrService: {
        enabled: true,
        status: 'OPERATIONAL',
        engine: 'Tesseract & Pattern Extraction Engine',
        description: 'Extracts FDR number, issuing bank, deposit amount, and dates. Always reviewed by human officer.',
      },
      emailProvider: {
        enabled: env.SMTP_ENABLED,
        status: env.SMTP_ENABLED ? 'CONFIGURED' : 'IN_APP_PERSISTENT_NOTIFICATION_ACTIVE',
        description: env.SMTP_ENABLED
          ? 'Emails dispatched via configured SMTP gateway'
          : 'In-app real-time notification engine actively recording notifications with persistent delivery logs.',
      },
      smsProvider: {
        enabled: false,
        status: 'UNAVAILABLE',
        description: 'SMS notifications require authorized telecom gateway credentials.',
      },
    },
  });
});

export default router;
