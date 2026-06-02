/**
 * Standardized API response helpers and error-code constants.
 *
 * Every API response follows one of two shapes:
 *   success: { success: true,  data }
 *   error:   { success: false, error: { code, message, fields? } }
 */

const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * Send a successful JSON response.
 * @param {object} res        Express response
 * @param {*}      data       Payload to return under `data`
 * @param {number} statusCode HTTP status code (default 200)
 */
function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

/**
 * Send an error JSON response.
 * @param {object}      res        Express response
 * @param {string}      code       One of ERROR_CODES
 * @param {string}      message    Human-readable error message
 * @param {Array|null}  fields     Optional per-field validation details
 * @param {number}      statusCode HTTP status code (default 500)
 */
function errorResponse(res, code, message, fields = null, statusCode = 500) {
  const error = { code, message };
  if (fields) {
    error.fields = fields;
  }
  return res.status(statusCode).json({ success: false, error });
}

module.exports = { ERROR_CODES, successResponse, errorResponse };
