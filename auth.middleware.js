import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwtHelper.js';

const TEST_JWT_SECRET = 'test-jwt-secret-key-for-unit-tests';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-unit-tests';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
});

describe('JWT Helper', () => {
  const samplePayload = {
    userId: 'DPS-RKP-T-001',
    role: 'teacher',
    schoolCode: 'DPS-RKP-001',
    name: 'Test Teacher',
  };

  describe('generateAccessToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateAccessToken(samplePayload);
      expect(typeof token).toBe('string');
      // JWTs have three dot-separated parts
      expect(token.split('.')).toHaveLength(3);
    });

    it('should use HS256 algorithm', () => {
      const token = generateAccessToken(samplePayload);
      const header = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString()
      );
      expect(header.alg).toBe('HS256');
    });

    it('should include payload fields in the token', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.role).toBe(samplePayload.role);
      expect(decoded.schoolCode).toBe(samplePayload.schoolCode);
      expect(decoded.name).toBe(samplePayload.name);
    });

    it('should set expiry to 15 minutes', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      // exp - iat should be 900 seconds (15 minutes)
      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it('should be signed with JWT_SECRET', () => {
      const token = generateAccessToken(samplePayload);
      // Verifying with the correct secret should succeed
      expect(() => jwt.verify(token, TEST_JWT_SECRET)).not.toThrow();
      // Verifying with a wrong secret should fail
      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateRefreshToken(samplePayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload fields in the token', () => {
      const token = generateRefreshToken(samplePayload);
      const decoded = jwt.verify(token, TEST_JWT_REFRESH_SECRET);
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.role).toBe(samplePayload.role);
      expect(decoded.schoolCode).toBe(samplePayload.schoolCode);
      expect(decoded.name).toBe(samplePayload.name);
    });

    it('should set expiry to 7 days', () => {
      const token = generateRefreshToken(samplePayload);
      const decoded = jwt.verify(token, TEST_JWT_REFRESH_SECRET);
      // exp - iat should be 604800 seconds (7 days)
      expect(decoded.exp - decoded.iat).toBe(604800);
    });

    it('should be signed with JWT_REFRESH_SECRET', () => {
      const token = generateRefreshToken(samplePayload);
      expect(() => jwt.verify(token, TEST_JWT_REFRESH_SECRET)).not.toThrow();
      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should use a different secret than access tokens', () => {
      const accessToken = generateAccessToken(samplePayload);
      const refreshToken = generateRefreshToken(samplePayload);
      // Access token should not verify with refresh secret
      expect(() => jwt.verify(accessToken, TEST_JWT_REFRESH_SECRET)).toThrow();
      // Refresh token should not verify with access secret
      expect(() => jwt.verify(refreshToken, TEST_JWT_SECRET)).toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('should return decoded payload for a valid token', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.role).toBe(samplePayload.role);
      expect(decoded.schoolCode).toBe(samplePayload.schoolCode);
      expect(decoded.name).toBe(samplePayload.name);
    });

    it('should include iat and exp in decoded payload', () => {
      const token = generateAccessToken(samplePayload);
      const decoded = verifyAccessToken(token);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.string')).toThrow();
    });

    it('should throw for a token signed with wrong secret', () => {
      const token = jwt.sign(samplePayload, 'wrong-secret', {
        expiresIn: '15m',
      });
      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should throw for an expired token', () => {
      const token = jwt.sign(samplePayload, TEST_JWT_SECRET, {
        expiresIn: '0s',
      });
      expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return decoded payload for a valid token', () => {
      const token = generateRefreshToken(samplePayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.role).toBe(samplePayload.role);
      expect(decoded.schoolCode).toBe(samplePayload.schoolCode);
      expect(decoded.name).toBe(samplePayload.name);
    });

    it('should include iat and exp in decoded payload', () => {
      const token = generateRefreshToken(samplePayload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyRefreshToken('invalid.token.string')).toThrow();
    });

    it('should throw for a token signed with wrong secret', () => {
      const token = jwt.sign(samplePayload, 'wrong-secret', {
        expiresIn: '7d',
      });
      expect(() => verifyRefreshToken(token)).toThrow();
    });

    it('should throw for an expired token', () => {
      const token = jwt.sign(samplePayload, TEST_JWT_REFRESH_SECRET, {
        expiresIn: '0s',
      });
      expect(() => verifyRefreshToken(token)).toThrow(jwt.TokenExpiredError);
    });
  });
});
