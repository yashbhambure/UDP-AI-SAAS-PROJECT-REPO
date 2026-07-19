const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDev = process.env.NODE_ENV !== 'production';

const formats = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    return stack ? `${base}\n${stack}` : base;
  }),
];

const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(...formats),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        ...formats
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * logLLMOutput — writes raw LLM responses to a dedicated file in dev mode.
 * Used for debugging extraction prompt tuning.
 * @param {string} promptName - Identifier for the prompt type (e.g. "extraction")
 * @param {string} rawOutput - The raw string returned by Gemini
 */
logger.logLLMOutput = (promptName, rawOutput) => {
  if (!isDev) return;
  const llmLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, message }) => `[${timestamp}] ${message}`)
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'llm_raw.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
      }),
    ],
  });
  llmLogger.debug(`\n=== ${promptName.toUpperCase()} ===\n${rawOutput}\n${'='.repeat(60)}`);
};

module.exports = logger;
