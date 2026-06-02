import { describe, it, expect, vi } from 'vitest';
import { schoolScope } from '../../middleware/school.middleware.js';

/**
 * Helper: creates a mock Express request object.
 */
function mockReq(overrides = {}) {
  return {
    headers: {},
    query: {},
    body: {},
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

describe('schoolScope middleware', () => {
  it('should set req.schoolFilter with schoolCode from req.user for non-super_admin roles', () => {
    const req = mockReq({
      user: { userId: 'DPS-RKP-T-001', role: 'teacher', schoolCode: 'DPS-RKP-001', name: 'Teacher' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({ schoolCode: 'DPS-RKP-001' });
  });

  it('should set req.schoolFilter to empty object for super_admin role', () => {
    const req = mockReq({
      user: { userId: 'SA-001', role: 'super_admin', schoolCode: null, name: 'Super Admin' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({});
  });

  it('should use schoolCode from JWT token, ignoring client-supplied schoolCode in query params', () => {
    const req = mockReq({
      user: { userId: 'DPS-RKP-T-001', role: 'teacher', schoolCode: 'DPS-RKP-001', name: 'Teacher' },
      query: { schoolCode: 'HACKED-SCHOOL-999' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({ schoolCode: 'DPS-RKP-001' });
    expect(req.schoolFilter.schoolCode).not.toBe('HACKED-SCHOOL-999');
  });

  it('should use schoolCode from JWT token, ignoring client-supplied schoolCode in request body', () => {
    const req = mockReq({
      user: { userId: 'ADM-001', role: 'school_admin', schoolCode: 'DPS-RKP-001', name: 'Admin' },
      body: { schoolCode: 'ANOTHER-SCHOOL-002' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({ schoolCode: 'DPS-RKP-001' });
    expect(req.schoolFilter.schoolCode).not.toBe('ANOTHER-SCHOOL-002');
  });

  it('should return 401 when req.user is not set', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should work correctly for school_admin role', () => {
    const req = mockReq({
      user: { userId: 'ADM-001', role: 'school_admin', schoolCode: 'ABC-DEL-005', name: 'Principal' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({ schoolCode: 'ABC-DEL-005' });
  });

  it('should work correctly for student role', () => {
    const req = mockReq({
      user: { userId: 'DPS-RKP-S-2024-047', role: 'student', schoolCode: 'DPS-RKP-001', name: 'Student' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.schoolFilter).toEqual({ schoolCode: 'DPS-RKP-001' });
  });

  it('should not modify other properties on the request object', () => {
    const req = mockReq({
      user: { userId: 'T-001', role: 'teacher', schoolCode: 'SC-001', name: 'Teacher' },
      query: { class: '10', section: 'A' },
      body: { date: '2024-01-15' },
    });
    const res = mockRes();
    const next = vi.fn();

    schoolScope(req, res, next);

    expect(req.query).toEqual({ class: '10', section: 'A' });
    expect(req.body).toEqual({ date: '2024-01-15' });
    expect(req.user.role).toBe('teacher');
  });
});
