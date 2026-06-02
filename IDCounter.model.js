import { describe, it, expect, vi } from 'vitest';
import {
  ERROR_CODES,
  successResponse,
  errorResponse,
} from '../../utils/responseHandler.js';

/**
 * Helper that creates a minimal Express-like response object
 * so we can assert on status codes and JSON bodies.
 */
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

// ── ERROR_CODES ─────────────────────────────────────────────────────
describe('ERROR_CODES', () => {
  it('should expose all expected error code constants', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERROR_CODES.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  it('should contain exactly 8 error codes', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(8);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });
});

// ── successResponse ─────────────────────────────────────────────────
describe('successResponse', () => {
  it('should send { success: true, data } with status 200 by default', () => {
    const res = createMockRes();
    const data = { id: 1, name: 'Test' };

    successResponse(res, data);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true, data: { id: 1, name: 'Test' } });
  });

  it('should use a custom status code when provided', () => {
    const res = createMockRes();

    successResponse(res, { created: true }, 201);

    expect(res._status).toBe(201);
    expect(res._json).toEqual({ success: true, data: { created: true } });
  });

  it('should handle null data', () => {
    const res = createMockRes();

    successResponse(res, null);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true, data: null });
  });

  it('should handle array data', () => {
    const res = createMockRes();
    const items = [{ id: 1 }, { id: 2 }];

    successResponse(res, items);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true, data: items });
  });
});

// ── errorResponse ───────────────────────────────────────────────────
describe('errorResponse', () => {
  it('should send { success: false, error: { code, message } } with status 500 by default', () => {
    const res = createMockRes();

    errorResponse(res, ERROR_CODES.INTERNAL_ERROR, 'Something went wrong');

    expect(res._status).toBe(500);
    expect(res._json).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      },
    });
  });

  it('should use a custom status code when provided', () => {
    const res = createMockRes();

    errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      null,
      400
    );

    expect(res._status).toBe(400);
    expect(res._json.error.code).toBe('VALIDATION_ERROR');
  });

  it('should include fields when provided', () => {
    const res = createMockRes();
    const fields = [
      { field: 'email', message: 'Email is required' },
      { field: 'name', message: 'Name is required' },
    ];

    errorResponse(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      fields,
      400
    );

    expect(res._status).toBe(400);
    expect(res._json).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields,
      },
    });
  });

  it('should omit fields key when fields is null', () => {
    const res = createMockRes();

    errorResponse(res, ERROR_CODES.NOT_FOUND, 'Resource not found', null, 404);

    expect(res._status).toBe(404);
    expect(res._json.error).not.toHaveProperty('fields');
  });

  it('should omit fields key when fields is not provided', () => {
    const res = createMockRes();

    errorResponse(res, ERROR_CODES.UNAUTHORIZED, 'Not authenticated');

    expect(res._json.error).not.toHaveProperty('fields');
  });

  it('should work with each error code constant', () => {
    const codeStatusMap = {
      VALIDATION_ERROR: 400,
      INVALID_CREDENTIALS: 401,
      TOKEN_EXPIRED: 401,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      DUPLICATE_ENTRY: 409,
      INTERNAL_ERROR: 500,
    };

    for (const [code, status] of Object.entries(codeStatusMap)) {
      const res = createMockRes();
      errorResponse(res, ERROR_CODES[code], `Error: ${code}`, null, status);

      expect(res._status).toBe(status);
      expect(res._json.success).toBe(false);
      expect(res._json.error.code).toBe(code);
      expect(res._json.error.message).toBe(`Error: ${code}`);
    }
  });
});
