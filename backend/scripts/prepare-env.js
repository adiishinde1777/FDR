const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.log('[prepare-env] No .env file found. Creating default .env with SQLite configuration...');
  const defaultEnv = [
    '# Default Environment for Render / Production Build',
    'DATABASE_URL="file:./dev.db"',
    'NODE_ENV="production"',
    'PORT=5000',
    'API_PREFIX="/api/v1"',
    'SESSION_SECRET="aicte_super_secret_session_key_production_grade_random_938472910"',
    'CSRF_SECRET="aicte_csrf_token_secret_key_8372918374928"',
    'COOKIE_DOMAIN="localhost"',
    'UPLOAD_STORAGE_DIR="./storage/documents"',
    'MAX_FILE_SIZE_BYTES=10485760',
    'ALLOWED_MIME_TYPES="application/pdf,image/jpeg,image/png"',
    'SCHEDULER_ENABLED=true',
    'TIMEZONE="Asia/Kolkata"',
    'MATURITY_REMINDER_DAYS="30,15,7,0"',
    '',
  ].join('\n');

  fs.writeFileSync(envPath, defaultEnv, 'utf8');
  console.log('[prepare-env] .env created successfully.');
} else {
  console.log('[prepare-env] Existing .env file detected.');
}
