import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  APP_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_SECRET: z.string().default('aicte_fdr_session_super_secret_key_2026'),
  CSRF_SECRET: z.string().default('aicte_csrf_token_secret_key_2026'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  UPLOAD_STORAGE_DIR: z.string().default('./storage/documents'),
  MAX_FILE_SIZE_BYTES: z.string().default('10485760').transform((v) => parseInt(v, 10)),
  ALLOWED_MIME_TYPES: z.string().default('application/pdf,image/jpeg,image/png'),
  SCHEDULER_ENABLED: z.string().default('true').transform((v) => v === 'true'),
  TIMEZONE: z.string().default('Asia/Kolkata'),
  MATURITY_REMINDER_DAYS: z.string().default('30,15,7,0'),
  BANK_VERIFICATION_API_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  BANK_VERIFICATION_API_URL: z.string().default('https://api.bankverification.example.gov.in/v1'),
  AICTE_PORTAL_API_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  SMTP_ENABLED: z.string().default('false').transform((v) => v === 'true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
