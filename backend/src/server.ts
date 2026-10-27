import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startScheduler } from './jobs/scheduler';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`========================================================`);
  logger.info(`AICTE Security Deposit / FDR Management Portal Backend`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Server listening on port: ${PORT}`);
  logger.info(`API Base URL: http://localhost:${PORT}${env.API_PREFIX}`);
  logger.info(`Swagger API Docs: http://localhost:${PORT}/api/docs`);
  logger.info(`========================================================`);

  // Start background monitoring scheduler
  startScheduler();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing HTTP server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Closing HTTP server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
