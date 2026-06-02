import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let app;
let User;
let School;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const appModule = await import('../../app.js');
  app = appModule.default || appModule;
  User = mongoose.model('User');
  School = mongoose.model('School');
});

afterEach(async () => {
  await User.deleteMany({});
  await School.deleteMany({});
  // Clean IDCounter collection if it exists
  const IDCounter = mongoose.models.IDCounter;
  if (IDCounter) await IDCounter.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

async function createUserAndLogin(overrides = {}) {
  const defaults = {
    userId: 'super-admin-001',
    role: 'super_admin',
    password: 'TestPassword123',
    name: 'Super Admin',
    email: 'admin@edusync.com',
    phone: '9876543210',
  };
  await User.create({ ...defaults, ...overrides });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ userId: defaults.userId, password: defaults.password, ...overrides.userId ? { userId: overrides.userId } : {}, ...overrides.password ? { password: overrides.password } : {} });

  return loginRes.body.data.accessToken;
}

async function loginUser(userId, password) {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ userId, password });
  return loginRes.body.data.accessToken;
}

const validRegistration = {
  name: 'Delhi Public School',
  board: 'CBSE',
  address: '123 Main Street, New Delhi',
  totalStudents: 500,
  contactName: 'Dr. Sharma',
  contactEmail: 'sharma@dps.edu',
  contactPhone: '9876543210',
};

describe('School Routes (server/routes/school.routes.js)', () => {
  describe('POST /api/schools/register', () => {
    it('should be publicly accessible and create a pending school', async () => {
      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistration);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.status).toBe('pending');
      expect(res.body.data.school.name).toBe('Delhi Public School');
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/schools/register')
        .send({ name: 'Incomplete School' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/schools', () => {
    it('should require authentication (return 401 without token)', async () => {
      const res = await request(app).get('/api/schools');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should require super_admin role (return 403 for school_admin)', async () => {
      const token = await createUserAndLogin({
        userId: 'SCH-ADM-001',
        role: 'school_admin',
        schoolCode: 'DPS-RKP-001',
      });

      const res = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return schools list for super_admin', async () => {
      const token = await createUserAndLogin();

      // Create a pending school
      await request(app)
        .post('/api/schools/register')
        .send(validRegistration);

      const res = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schools).toHaveLength(1);
    });
  });

  describe('PATCH /api/schools/:id/approve', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .patch('/api/schools/507f1f77bcf86cd799439011/approve')
        .send({ abbreviation: 'DPS', cityCode: 'RKP' });

      expect(res.status).toBe(401);
    });

    it('should require super_admin role', async () => {
      const token = await createUserAndLogin({
        userId: 'teacher-001',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
      });

      const res = await request(app)
        .patch('/api/schools/507f1f77bcf86cd799439011/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ abbreviation: 'DPS', cityCode: 'RKP' });

      expect(res.status).toBe(403);
    });

    it('should approve a pending school as super_admin', async () => {
      const token = await createUserAndLogin();

      // Register a school
      const regRes = await request(app)
        .post('/api/schools/register')
        .send(validRegistration);

      const schoolId = regRes.body.data.school._id;

      const res = await request(app)
        .patch(`/api/schools/${schoolId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ abbreviation: 'DPS', cityCode: 'DEL' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.status).toBe('approved');
      expect(res.body.data.school.schoolCode).toBeDefined();
      expect(res.body.data.adminUserId).toBeDefined();
    });
  });

  describe('PATCH /api/schools/:id/reject', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .patch('/api/schools/507f1f77bcf86cd799439011/reject')
        .send({ reason: 'Incomplete documents' });

      expect(res.status).toBe(401);
    });

    it('should reject a pending school as super_admin', async () => {
      const token = await createUserAndLogin();

      const regRes = await request(app)
        .post('/api/schools/register')
        .send(validRegistration);

      const schoolId = regRes.body.data.school._id;

      const res = await request(app)
        .patch(`/api/schools/${schoolId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Incomplete documents' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.status).toBe('rejected');
      expect(res.body.data.school.rejectionReason).toBe('Incomplete documents');
    });
  });

  describe('GET /api/schools/:code', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/schools/DPS-RKP-001');

      expect(res.status).toBe(401);
    });

    it('should require school_admin role', async () => {
      const token = await createUserAndLogin({
        userId: 'teacher-001',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
      });

      const res = await request(app)
        .get('/api/schools/DPS-RKP-001')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return school details for school_admin with matching schoolCode', async () => {
      const schoolCode = 'DPS-DEL-001';

      // Create a school record directly
      await School.create({
        ...validRegistration,
        schoolCode,
        abbreviation: 'DPS',
        cityCode: 'DEL',
        status: 'approved',
        adminUserId: 'school-admin-001',
      });

      // Create a school_admin user with known password
      await User.create({
        userId: 'school-admin-001',
        schoolCode,
        role: 'school_admin',
        password: 'TestPassword123',
        name: 'School Admin',
        email: 'admin@dps.edu',
        phone: '9876543210',
      });

      const adminToken = await loginUser('school-admin-001', 'TestPassword123');

      const res = await request(app)
        .get(`/api/schools/${schoolCode}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.schoolCode).toBe(schoolCode);
      expect(res.body.data.school.name).toBe('Delhi Public School');
    });
  });

  describe('PUT /api/schools/:code', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/schools/DPS-RKP-001')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(401);
    });

    it('should require school_admin role', async () => {
      const token = await createUserAndLogin({
        userId: 'teacher-002',
        role: 'teacher',
        schoolCode: 'DPS-RKP-001',
      });

      const res = await request(app)
        .put('/api/schools/DPS-RKP-001')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(403);
    });
  });
});
