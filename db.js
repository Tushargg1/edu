import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import { generateAccessToken } from '../../utils/jwtHelper.js';

const TEST_JWT_SECRET = 'test-jwt-secret-key-for-middleware-tests';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

/**
 * Helper: creates a mock Express request object.
 */
function mockReq(overrides = {}) {
  return {
    headers: {},
    ...overrides,
  };
}

/**
 * Helper: creates a mock Express response object with chainable status/json.
 */
function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
}

const samplePayload = {
  userId: 'DPS-RKP-T-001',
  role: 'teacher',
  schoolCode: 'DPS-RKP-001',
  name: 'Test Teacher',
};

describe('verifyToken middleware', () => {
  it('should attach req.user and call next() for a valid Bearer token', () => {
    const token = generateAccessToken(samplePayload);
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(samplePayload.userId);
    expect(req.user.role).toBe(samplePayload.role);
    expect(req.user.schoolCode).toBe(samplePayload.schoolCode);
    expect(req.user.name).toBe(samplePayload.name);
  });

  it('should only attach userId, role, schoolCode, name to req.user', () => {
    const token = generateAccessToken(samplePayload);
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    const keys = Object.keys(req.user);
    expect(keys).toEqual(['userId', 'role', 'schoolCode', 'name']);
  });

  it('should return 401 when Authorization header is missing', () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = mockReq({
      headers: { authorization: 'Basic some-token' },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 with UNAUTHORIZED code for an invalid token', () => {
    const req = mockReq({
      headers: { authorization: 'Bearer invalid.token.value' },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 with TOKEN_EXPIRED code for an expired token', () => {
    const token = jwt.sign(samplePayload, TEST_JWT_SECRET, {
      expiresIn: '0s',
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should return 401 for a token signed with wrong secret', () => {
    const token = jwt.sign(samplePayload, 'wrong-secret', {
      expiresIn: '15m',
    });
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Bearer keyword is present but token is empty', () => {
    const req = mockReq({
      headers: { authorization: 'Bearer ' },
    });
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireRole middleware', () => {
  it('should call next() when user role is in the allowed list', () => {
    const req = mockReq();
    req.user = { userId: 'u1', role: 'school_admin', schoolCode: 'SC-001', name: 'Admin' };
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('school_admin', 'super_admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user role is not in the allowed list', () => {
    const req = mockReq();
    req.user = { userId: 'u1', role: 'student', schoolCode: 'SC-001', name: 'Student' };
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('school_admin', 'teacher');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 403 when req.user is not set', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('school_admin');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should work with a single allowed role', () => {
    const req = mockReq();
    req.user = { userId: 'u1', role: 'super_admin', schoolCode: null, name: 'Super' };
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('super_admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should reject when role matches none of multiple allowed roles', () => {
    const req = mockReq();
    req.user = { userId: 'u1', role: 'teacher', schoolCode: 'SC-001', name: 'Teacher' };
    const res = mockRes();
    const next = vi.fn();

    const middleware = requireRole('super_admin', 'school_admin', 'student');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should allow each valid role when multiple roles are permitted', () => {
    const roles = ['school_admin', 'teacher'];
    for (const role of roles) {
      const req = mockReq();
      req.user = { userId: 'u1', role, schoolCode: 'SC-001', name: 'User' };
      const res = mockRes();
      const next = vi.fn();

      const middleware = requireRole('school_admin', 'teacher');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    }
  });
});
