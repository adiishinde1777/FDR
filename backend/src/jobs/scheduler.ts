import { maturityMonitoringService } from '../services/maturity.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let intervalHandle: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    logger.info('Background scheduler is disabled by configuration.');
    return;
  }

  logger.info('Initializing persistent background job scheduler...');

  // Run immediate maturity check on startup (recovering after restart)
  maturityMonitoringService
    .runMaturityCheck()
    .then((res) => {
      logger.info(`Startup maturity monitoring run complete. ${res.alertsCreated} alerts issued.`);
    })
    .catch((err) => {
      logger.error('Startup maturity check failed', { error: err.message });
    });

  // Run periodic scheduled check every 6 hours (6 * 60 * 60 * 1000 ms)
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  intervalHandle = setInterval(() => {
    maturityMonitoringService
      .runMaturityCheck()
      .then((res) => {
        logger.info(`Periodic maturity check complete: ${res.checked} scanned, ${res.alertsCreated} alerts generated.`);
      })
      .catch((err) => {
        logger.error('Periodic maturity monitoring error', { error: err.message });
      });
  }, INTERVAL_MS);

  logger.info('Persistent background scheduler started successfully.');
}

export function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Background scheduler stopped.');
  }
}
