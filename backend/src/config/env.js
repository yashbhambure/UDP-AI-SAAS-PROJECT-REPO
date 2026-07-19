/**
 * env.js — validates all required environment variables at startup.
 * Throws immediately if any required var is missing, so the app fails fast
 * rather than crashing deep inside a service call.
 */

const REQUIRED_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'GROQ_API_KEY',
];

const OPTIONAL_DEFAULTS = {
  PORT: '5000',
  NODE_ENV: 'development',
  JWT_EXPIRES_IN: '7d',
  VECTOR_DB_URL: 'http://localhost:8000',
  VECTOR_DB_TYPE: 'chroma',
  REMINDER_DAYS_BEFORE: '7,2,0',
  REMINDER_CRON: '*/5 * * * *',
  MAX_FILE_SIZE_MB: '25',
};

const validateEnv = () => {
  // Apply defaults for optional vars not set
  for (const [key, defaultVal] of Object.entries(OPTIONAL_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = defaultVal;
    }
  }

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[ENV] Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy .env.example to .env and fill in the values.`
    );
  }
};

module.exports = validateEnv;
