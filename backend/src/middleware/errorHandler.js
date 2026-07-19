const logger = require('../utils/logger');
const { LLMError } = require('../services/llmService');

/**
 * globalErrorHandler — catches all uncaught exceptions in Express routes.
 * Ensures we never return a HTML crash page or raw stack trace.
 */
const globalErrorHandler = (err, req, res, next) => {
  logger.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle Multer upload errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxSize = process.env.MAX_FILE_SIZE_MB || '25';
    return res.status(400).json({
      error: `File size exceeds the limit of ${maxSize}MB.`,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Too many files uploaded. The maximum allowed is 10 files per batch.',
    });
  }

  // Handle LLM specific error
  if (err instanceof LLMError) {
    return res.status(err.statusCode || 422).json({
      error: err.message,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: messages.join(', '),
    });
  }

  // Mongoose duplicate key error (e.g. unique email registration)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: `A record with this ${field} already exists.`,
    });
  }

  // Default server error
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    error: isDev ? err.message : 'An internal server error occurred.',
    stack: isDev ? err.stack : undefined,
  });
};

module.exports = globalErrorHandler;
