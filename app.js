import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let User;
let authController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Import after mongoose is connected to avoid model compilation issues
  // The controller's require() of User.model.js will register the model
  authController = await import('../../controllers/auth.controller.js');
  User = mongoose.model('User');
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

/**
 * Build a minimal Express app wired with the auth controller handlers.
 */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Login route (public)
  app.post('/api/auth/login', authController.loginValidation, authController.login);

  // Logout route (requires req.user — we simulate via middleware)
  app.post('/api/auth/logout', (req, res, next) => {
    if (req.headers['x-test-user']) {
      req.user = JSON.parse(req.headers['x-test-user']);
    }
    next();
  }, authController.logout);

  // Refresh route (public, uses cookie)
  app.post('/api/auth/refresh', authController.refresh);

  // GetMe route (requires req.user)
  app.get('/api/auth/me', (req, res, next) => {
    if (req.headers['x-test-user']) {
      req.user = JSON.parse(req.headers['x-test-user']);
    }
    next();
  }, authController.getMe);

  return app;
}

async function createTestUser(overrides = {}) {
  const defaults = {
    userId: 'DPS-RKP-T-001',
    schoolCode: 'DPS-RKP-001',
    role: 'teacher',
    password: 'TestPassword123',
    name: 'Test Teacher',
    email: 'teacher@school.com',
    phone: '9876543210',
  };
  return User.create({ ...defaults, ...overrides });
}

describe('Auth Controller', () => {
  describe('POST /api/auth/login', () => {
    it('should return access token and user info for valid credentials', async () => {
      const app = buildApp();
      await createTestUser();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toEqual({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
        name: 'Test Teacher',
      });
    });

    it('should set refresh token as httpOnly cookie', async () => {
      const app = buildApp();
      await createTestUser();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
    });

    it('should save refresh token to User record', async () => {
      const app = buildApp();
      await createTestUser();

      await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const user = await User.findOne({ userId: 'DPS-RKP-T-001' });
      expect(user.refreshToken).toBeDefined();
      expect(user.refreshToken).not.toBeNull();
    });

    it('should return 401 for wrong password', async () => {
      const app = buildApp();
      await createTestUser();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent userId', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'NONEXISTENT', password: 'SomePassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return same error message for wrong userId and wrong password (no info leak)', async () => {
      const app = buildApp();
      await createTestUser();

      const wrongUserRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'NONEXISTENT', password: 'SomePassword' });

      const wrongPassRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'WrongPassword' });

      expect(wrongUserRes.body.error.message).toBe(wrongPassRes.body.error.message);
      expect(wrongUserRes.body.error.code).toBe(wrongPassRes.body.error.code);
    });

    it('should return 400 validation error when userId is missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'SomePassword' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toBeDefined();
      expect(res.body.error.fields.some((f) => f.field === 'userId')).toBe(true);
    });

    it('should return 400 validation error when password is missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toBeDefined();
      expect(res.body.error.fields.some((f) => f.field === 'password')).toBe(true);
    });

    it('should return 400 when both userId and password are missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear refresh token from User record', async () => {
      const app = buildApp();
      await createTestUser();

      // First login to set a refresh token
      await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      // Verify refresh token was set
      let dbUser = await User.findOne({ userId: 'DPS-RKP-T-001' });
      expect(dbUser.refreshToken).not.toBeNull();

      // Logout
      const res = await request(app)
        .post('/api/auth/logout')
        .set('x-test-user', JSON.stringify({
          userId: 'DPS-RKP-T-001',
          role: 'teacher',
          schoolCode: 'DPS-RKP-001',
          name: 'Test Teacher',
        }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify refresh token was cleared
      dbUser = await User.findOne({ userId: 'DPS-RKP-T-001' });
      expect(dbUser.refreshToken).toBeNull();
    });

    it('should clear the refreshToken cookie', async () => {
      const app = buildApp();
      await createTestUser();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('x-test-user', JSON.stringify({
          userId: 'DPS-RKP-T-001',
          role: 'teacher',
          schoolCode: 'DPS-RKP-001',
          name: 'Test Teacher',
        }));

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      // Cleared cookies have an expiry in the past or empty value
      expect(refreshCookie).toMatch(/refreshToken=;|Expires=Thu, 01 Jan 1970/i);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue a new access token with a valid refresh token cookie', async () => {
      const app = buildApp();
      await createTestUser();

      // Login to get a refresh token cookie
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const cookies = loginRes.headers['set-cookie'];

      // Use the refresh token cookie to get a new access token
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 when no refresh token cookie is present', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when refresh token cookie is invalid', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token-value']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when refresh token does not match stored token', async () => {
      const app = buildApp();
      await createTestUser();

      // Login to get a valid refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const cookies = loginRes.headers['set-cookie'];

      // Manually clear the stored refresh token to simulate mismatch
      await User.findOneAndUpdate(
        { userId: 'DPS-RKP-T-001' },
        { refreshToken: 'different-token' }
      );

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 after user logs out and tries to refresh', async () => {
      const app = buildApp();
      await createTestUser();

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const cookies = loginRes.headers['set-cookie'];

      // Logout (clears stored refresh token)
      await request(app)
        .post('/api/auth/logout')
        .set('x-test-user', JSON.stringify({
          userId: 'DPS-RKP-T-001',
          role: 'teacher',
          schoolCode: 'DPS-RKP-001',
          name: 'Test Teacher',
        }));

      // Try to refresh with the old cookie
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user from req.user', async () => {
      const app = buildApp();
      const testUser = {
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
        name: 'Test Teacher',
      };

      const res = await request(app)
        .get('/api/auth/me')
        .set('x-test-user', JSON.stringify(testUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual(testUser);
    });

    it('should return user info for different roles', async () => {
      const app = buildApp();
      const adminUser = {
        userId: 'ADMIN-001',
        role: 'school_admin',
        schoolCode: 'DPS-RKP-001',
        name: 'Admin User',
      };

      const res = await request(app)
        .get('/api/auth/me')
        .set('x-test-user', JSON.stringify(adminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('school_admin');
      expect(res.body.data.user.userId).toBe('ADMIN-001');
    });
  });

  describe('Login with different roles', () => {
    it('should return correct user info for school_admin login', async () => {
      const app = buildApp();
      await createTestUser({
        userId: 'ADMIN-001',
        role: 'school_admin',
        name: 'School Admin',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'ADMIN-001', password: 'TestPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('school_admin');
      expect(res.body.data.user.userId).toBe('ADMIN-001');
    });

    it('should return correct user info for student login', async () => {
      const app = buildApp();
      await createTestUser({
        userId: 'DPS-RKP-S-2024-001',
        role: 'student',
        name: 'Test Student',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-S-2024-001', password: 'TestPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user.userId).toBe('DPS-RKP-S-2024-001');
    });
  });
});
