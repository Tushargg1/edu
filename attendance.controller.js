import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let app;
let User;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Import app after env vars and DB are set up
  const appModule = await import('../../app.js');
  app = appModule.default || appModule;
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

describe('Auth Routes (server/routes/auth.routes.js)', () => {
  describe('POST /api/auth/login', () => {
    it('should be publicly accessible and return tokens for valid credentials', async () => {
      await createTestUser();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.userId).toBe('DPS-RKP-T-001');
    });

    it('should apply loginValidation and reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should require authentication (return 401 without token)', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should log out successfully with a valid access token', async () => {
      await createTestUser();

      // Login to get an access token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const { accessToken } = loginRes.body.data;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Logged out successfully');

      // Verify refresh token was cleared from DB
      const user = await User.findOne({ userId: 'DPS-RKP-T-001' });
      expect(user.refreshToken).toBeNull();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should be publicly accessible (no Bearer token needed) and use cookie', async () => {
      await createTestUser();

      // Login to get refresh token cookie
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const cookies = loginRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 when no refresh cookie is present', async () => {
      const res = await request(app)
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should require authentication (return 401 without token)', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return current user info with a valid access token', async () => {
      await createTestUser();

      // Login to get an access token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ userId: 'DPS-RKP-T-001', password: 'TestPassword123' });

      const { accessToken } = loginRes.body.data;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
        name: 'Test Teacher',
      });
    });
  });
});
