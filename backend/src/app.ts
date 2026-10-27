import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { correlationIdMiddleware } from './middleware/correlationId';
import { apiRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import fs from 'fs';

// Import route modules
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import institutionsRouter from './modules/institutions/institutions.router';
import fdrRouter from './modules/fdr/fdr.router';
import documentsRouter from './modules/documents/documents.router';
import verificationRouter from './modules/verification/verification.router';
import approvalsRouter from './modules/approvals/approvals.router';
import maturityRouter from './modules/maturity/maturity.router';
import renewalsRouter from './modules/renewals/renewals.router';
import releasesRouter from './modules/releases/releases.router';
import notificationsRouter from './modules/notifications/notifications.router';
import reportsRouter from './modules/reports/reports.router';
import auditRouter from './modules/audit/audit.router';
import integrationsRouter from './modules/integrations/integrations.router';

export const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [env.APP_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(correlationIdMiddleware);
app.use(apiRateLimiter);
app.use(authenticate);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'AICTE Security Deposit / FDR Management Portal API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Swagger OpenAPI documentation
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AICTE Security Deposit / FDR Management Portal API',
    version: '1.0.0',
    description: 'REST API for AICTE administrative lifecycle of security deposits and Fixed Deposit Receipts (FDRs)',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'aicte_session' },
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate user with email and password',
        tags: ['Authentication'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@aicte-india.org' },
                  password: { type: 'string', example: 'Admin@Secure2026' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated successfully' } },
      },
    },
    '/fdrs': {
      get: { summary: 'List and filter FDR records', tags: ['FDR Management'] },
      post: { summary: 'Create new FDR draft or submission', tags: ['FDR Management'] },
    },
    '/verification/queue': {
      get: { summary: 'Get assigned verification cases', tags: ['Verification'] },
    },
    '/approvals/queue': {
      get: { summary: 'Get approval queue cases', tags: ['Approvals'] },
    },
    '/maturity/calendar': {
      get: { summary: 'Get upcoming FDR maturity calendar', tags: ['Maturity Monitoring'] },
    },
    '/reports/dashboard-stats': {
      get: { summary: 'Get aggregated statistics and analytics', tags: ['Reporting'] },
    },
    '/audit': {
      get: { summary: 'Query append-only audit trail logs', tags: ['Audit'] },
    },
  },
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount REST modules
const prefix = env.API_PREFIX; // /api/v1
app.use(`${prefix}/auth`, authRouter);
app.use(`${prefix}/users`, usersRouter);
app.use(`${prefix}/institutions`, institutionsRouter);
app.use(`${prefix}/fdrs`, fdrRouter);
app.use(`${prefix}/documents`, documentsRouter);
app.use(`${prefix}/verification`, verificationRouter);
app.use(`${prefix}/approvals`, approvalsRouter);
app.use(`${prefix}/maturity`, maturityRouter);
app.use(`${prefix}/renewals`, renewalsRouter);
app.use(`${prefix}/releases`, releasesRouter);
app.use(`${prefix}/notifications`, notificationsRouter);
app.use(`${prefix}/reports`, reportsRouter);
app.use(`${prefix}/audit`, auditRouter);
app.use(`${prefix}/integrations`, integrationsRouter);

// Serve frontend static assets in production
const frontendDistCandidates = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];

let frontendDistPath: string | null = null;
for (const candidate of frontendDistCandidates) {
  if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
    frontendDistPath = candidate;
    break;
  }
}

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath!, 'index.html'));
  });
} else {
  // If frontend is not built, provide a helpful default response on root
  app.get('/', (req, res) => {
    res.json({
      status: 'ONLINE',
      service: 'AICTE Security Deposit / FDR Management Portal API',
      version: '1.0.0',
      swaggerDocs: '/api/docs',
      healthCheck: '/api/health',
      apiPrefix: env.API_PREFIX,
    });
  });
}

// Centralized error handler
app.use(errorHandler);

export default app;
