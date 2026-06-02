import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../middleware/error.middleware.js';
import { ERROR_CODES } from '../../utils/responseHandler.js';

/**
 * Helpers — lightweight Express-like req / res / next stubs.
 */
function createMockReq(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    user: null,
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(body) {
      res._json = body;
      return res;
    },
  };
  return res;
}

const next = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── Mongoose ValidationError ────────────────────────────────────────
describe('errorHandler — Mongoose ValidationError', () => {
  it('should map to VALIDATION_ERROR (400) with field details', () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      email: { message: 'Email is required' },
      name: { message: 'Name must be at least 2 characters' },
    };

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(400);
    expect(res._json.success).toBe(false);
    expect(res._json.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(res._json.error.message).toBe('Validation failed');
    expect(res._json.error.fields).toEqual([
      { field: 'email', message: 'Email is required' },
      { field: 'name', message: 'Name must be at least 2 characters' },
    ]);
  });

  it('should handle a single validation field error', () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      phone: { message: 'Phone is invalid' },
    };

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(400);
    expect(res._json.error.fields).toHaveLength(1);
    expect(res._json.error.fields[0]).toEqual({
      field: 'phone',
      message: 'Phone is invalid',
    });
  });
});

// ── MongoDB duplicate key error ─────────────────────────────────────
describe('errorHandler — MongoDB duplicate key error (11000)', () => {
  it('should map code 11000 to DUPLICATE_ENTRY (409)', () => {
    const err = new Error('E11000 duplicate key error');
    err.code = 11000;
    err.keyPattern = { email: 1 };

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(409);
    expect(res._json.error.code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
    expect(res._json.error.message).toContain('email');
  });

  it('should handle compound duplicate key with multiple fields', () => {
    const err = new Error('E11000 duplicate key error');
    err.code = 11000;
    err.keyPattern = { schoolCode: 1, email: 1 };

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(409);
    expect(res._json.error.code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
    expect(res._json.error.message).toContain('schoolCode');
    expect(res._json.error.message).toContain('email');
  });

  it('should use fallback message when keyPattern is missing', () => {
    const err = new Error('E11000 duplicate key error');
    err.code = 11000;

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(409);
    expect(res._json.error.code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
    expect(res._json.error.message).toBe('Duplicate entry');
  });
});

// ── JWT errors ──────────────────────────────────────────────────────
describe('errorHandler — JWT errors', () => {
  it('should map TokenExpiredError to TOKEN_EXPIRED (401)', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.code).toBe(ERROR_CODES.TOKEN_EXPIRED);
    expect(res._json.error.message).toBe('Token has expired');
  });

  it('should map JsonWebTokenError to UNAUTHORIZED (401)', () => {
    const err = new Error('invalid signature');
    err.name = 'JsonWebTokenError';

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(res._json.error.message).toBe('Invalid token');
  });
});

// ── Generic / unknown errors → INTERNAL_ERROR ───────────────────────
describe('errorHandler — generic errors (500)', () => {
  it('should default to INTERNAL_ERROR (500) for unknown errors', () => {
    const err = new Error('Something broke');

    const req = createMockReq();
    const res = createMockRes();

    // Suppress console.error output during test
    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, req, res, next);

    expect(res._status).toBe(500);
    expect(res._json.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(res._json.error.message).toBe('An unexpected error occurred');
  });

  it('should hide the original error message in the response', () => {
    const err = new Error('secret database connection string leaked');

    const req = createMockReq();
    const res = createMockRes();

    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, req, res, next);

    expect(res._json.error.message).toBe('An unexpected error occurred');
    expect(res._json.error.message).not.toContain('secret');
  });

  it('should log the error with request context', () => {
    const err = new Error('DB timeout');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockReq({
      method: 'POST',
      originalUrl: '/api/schools/register',
      user: { userId: 'ADM-001' },
    });
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('POST');
    expect(consoleSpy.mock.calls[0][0]).toContain('/api/schools/register');
    expect(consoleSpy.mock.calls[0][0]).toContain('DB timeout');
    expect(consoleSpy.mock.calls[0][1]).toHaveProperty('userId', 'ADM-001');
  });

  it('should not include stack trace in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Crash');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    const logContext = consoleSpy.mock.calls[0][1];
    expect(logContext.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include stack trace in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Crash');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    const logContext = consoleSpy.mock.calls[0][1];
    expect(logContext.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include fields in the response for generic errors', () => {
    const err = new Error('Oops');

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._json.error).not.toHaveProperty('fields');
  });
});

// ── Custom statusCode / code pass-through ───────────────────────────
describe('errorHandler — custom error properties', () => {
  it('should respect a custom statusCode on the error object', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    err.code = ERROR_CODES.NOT_FOUND;

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(404);
    expect(res._json.error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(res._json.error.message).toBe('Not found');
  });

  it('should respect a custom 403 FORBIDDEN error', () => {
    const err = new Error('Access denied');
    err.statusCode = 403;
    err.code = ERROR_CODES.FORBIDDEN;

    const req = createMockReq();
    const res = createMockRes();

    errorHandler(err, req, res, next);

    expect(res._status).toBe(403);
    expect(res._json.error.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(res._json.error.message).toBe('Access denied');
  });
});

// ── Response shape consistency ──────────────────────────────────────
describe('errorHandler — response shape', () => {
  it('should always return { success: false, error: { code, message } }', () => {
    const errors = [
      (() => { const e = new Error('v'); e.name = 'ValidationError'; e.errors = { a: { message: 'bad' } }; return e; })(),
      (() => { const e = new Error('d'); e.code = 11000; e.keyPattern = { x: 1 }; return e; })(),
      (() => { const e = new Error('t'); e.name = 'TokenExpiredError'; return e; })(),
      (() => { const e = new Error('j'); e.name = 'JsonWebTokenError'; return e; })(),
      new Error('generic'),
    ];

    vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const err of errors) {
      const res = createMockRes();
      errorHandler(err, createMockReq(), res, next);

      expect(res._json).toHaveProperty('success', false);
      expect(res._json.error).toHaveProperty('code');
      expect(res._json.error).toHaveProperty('message');
      expect(typeof res._json.error.code).toBe('string');
      expect(typeof res._json.error.message).toBe('string');
    }
  });
});
