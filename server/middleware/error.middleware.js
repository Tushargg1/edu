const { ERROR_CODES } = require('../utils/responseHandler.js');

/**
 * Centralized Express error-handling middleware.
 *
 * Catches all unhandled errors, maps known error types to the
 * appropriate API error code / HTTP status, and returns a consistent
 * JSON response.  Stack traces are only logged in non-production
 * environments.
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || ERROR_CODES.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let fields = null;

  // ── Mongoose ValidationError ────────────────────────────────────
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
    fields = Object.entries(err.errors).map(([field, detail]) => ({
      field,
      message: detail.message,
    }));
  }

  // ── MongoDB duplicate key error (code 11000) ───────────────────
  else if (err.code === 11000 || err.code === 11001) {
    statusCode = 409;
    code = ERROR_CODES.DUPLICATE_ENTRY;
    const keyPattern = err.keyPattern || {};
    const duplicateFields = Object.keys(keyPattern).join(', ');
    message = duplicateFields
      ? `Duplicate value for: ${duplicateFields}`
      : 'Duplicate entry';
  }

  // ── JWT TokenExpiredError ──────────────────────────────────────
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Token has expired';
  }

  // ── JWT JsonWebTokenError (malformed / invalid signature) ──────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ERROR_CODES.UNAUTHORIZED;
    message = 'Invalid token';
  }

  // ── Generic 500 — hide details in production ───────────────────
  if (statusCode === 500) {
    console.error(
      `[Error] ${req.method} ${req.originalUrl} — ${err.message}`,
      {
        userId: req.user?.userId,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      }
    );
    message = 'An unexpected error occurred';
  }

  const body = {
    success: false,
    error: { code, message },
  };

  if (fields) {
    body.error.fields = fields;
  }

  res.status(statusCode).json(body);
}

module.exports = { errorHandler };
