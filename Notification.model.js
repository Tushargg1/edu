import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let School;
let User;
let IDCounter;
let schoolController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  schoolController = await import('../../controllers/school.controller.js');
  School = mongoose.model('School');
  User = mongoose.model('User');
  IDCounter = mongoose.model('IDCounter');
});

afterEach(async () => {
  await School.deleteMany({});
  await User.deleteMany({});
  await IDCounter.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

/**
 * Build a minimal Express app wired with the school controller handlers.
 */
function buildApp() {
  const app = express();
  app.use(express.json());

  // POST /api/schools/register — public
  app.post(
    '/api/schools/register',
    schoolController.registerValidation,
    schoolController.register
  );

  // GET /api/schools — super_admin (simulated via x-test-user header)
  app.get('/api/schools', injectTestUser, schoolController.listSchools);

  // PATCH /api/schools/:id/approve — super_admin
  app.patch(
    '/api/schools/:id/approve',
    injectTestUser,
    schoolController.approveValidation,
    schoolController.approveSchool
  );

  // PATCH /api/schools/:id/reject — super_admin
  app.patch(
    '/api/schools/:id/reject',
    injectTestUser,
    schoolController.rejectValidation,
    schoolController.rejectSchool
  );

  // GET /api/schools/:code — school_admin (school-scoped)
  app.get(
    '/api/schools/:code',
    injectTestUser,
    injectSchoolFilter,
    schoolController.getSchool
  );

  // PUT /api/schools/:code — school_admin (school-scoped)
  app.put(
    '/api/schools/:code',
    injectTestUser,
    injectSchoolFilter,
    schoolController.updateSchool
  );

  return app;
}

/** Middleware to simulate verifyToken by reading x-test-user header */
function injectTestUser(req, res, next) {
  if (req.headers['x-test-user']) {
    req.user = JSON.parse(req.headers['x-test-user']);
  }
  next();
}

/** Middleware to simulate schoolScope */
function injectSchoolFilter(req, res, next) {
  if (req.user && req.user.role === 'super_admin') {
    req.schoolFilter = {};
  } else if (req.user) {
    req.schoolFilter = { schoolCode: req.user.schoolCode };
  } else {
    req.schoolFilter = {};
  }
  next();
}

function validRegistrationData(overrides = {}) {
  return {
    name: 'Delhi Public School',
    board: 'CBSE',
    address: '123 Main Road, New Delhi',
    totalStudents: 500,
    contactName: 'Dr. Sharma',
    contactEmail: 'principal@dps.edu',
    contactPhone: '9876543210',
    ...overrides,
  };
}

const superAdminUser = {
  userId: 'SUPER-ADMIN-001',
  role: 'super_admin',
  schoolCode: null,
  name: 'Super Admin',
};

describe('School Controller', () => {
  describe('POST /api/schools/register', () => {
    it('should create a pending school record with valid data', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.name).toBe('Delhi Public School');
      expect(res.body.data.school.status).toBe('pending');
      expect(res.body.data.school.board).toBe('CBSE');
    });

    it('should store abbreviation and cityCode when provided', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData({ abbreviation: 'DPS', cityCode: 'DEL' }));

      expect(res.status).toBe(201);
      expect(res.body.data.school.abbreviation).toBe('DPS');
      expect(res.body.data.school.cityCode).toBe('DEL');
    });

    it('should return 400 when name is missing', async () => {
      const app = buildApp();
      const data = validRegistrationData();
      delete data.name;

      const res = await request(app)
        .post('/api/schools/register')
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'name')).toBe(true);
    });

    it('should return 400 when board is missing', async () => {
      const app = buildApp();
      const data = validRegistrationData();
      delete data.board;

      const res = await request(app)
        .post('/api/schools/register')
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'board')).toBe(true);
    });

    it('should return 400 when contactEmail is invalid', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData({ contactEmail: 'not-an-email' }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'contactEmail')).toBe(true);
    });

    it('should return 400 when totalStudents is not a positive integer', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData({ totalStudents: -5 }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'totalStudents')).toBe(true);
    });

    it('should return 400 when multiple required fields are missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/schools/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.fields.length).toBeGreaterThanOrEqual(7);
    });

    it('should return 409 for duplicate name + address', async () => {
      const app = buildApp();
      const data = validRegistrationData();

      // First registration
      await request(app).post('/api/schools/register').send(data);

      // Second registration with same name + address
      const res = await request(app)
        .post('/api/schools/register')
        .send(data);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('should allow same name with different address', async () => {
      const app = buildApp();

      await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData());

      const res = await request(app)
        .post('/api/schools/register')
        .send(validRegistrationData({ address: '456 Other Road, Mumbai' }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/schools', () => {
    it('should return all schools when no status filter', async () => {
      const app = buildApp();

      // Create schools with different statuses
      await School.create({
        name: 'School A',
        board: 'CBSE',
        address: 'Addr A',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });
      await School.create({
        name: 'School B',
        board: 'ICSE',
        address: 'Addr B',
        totalStudents: 200,
        contactName: 'B',
        contactEmail: 'b@test.com',
        contactPhone: '2222222222',
        status: 'approved',
        schoolCode: 'SCH-TST-001',
      });

      const res = await request(app)
        .get('/api/schools')
        .set('x-test-user', JSON.stringify(superAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.schools).toHaveLength(2);
    });

    it('should filter schools by status query param', async () => {
      const app = buildApp();

      await School.create({
        name: 'School A',
        board: 'CBSE',
        address: 'Addr A',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });
      await School.create({
        name: 'School B',
        board: 'ICSE',
        address: 'Addr B',
        totalStudents: 200,
        contactName: 'B',
        contactEmail: 'b@test.com',
        contactPhone: '2222222222',
        status: 'approved',
        schoolCode: 'SCH-TST-001',
      });

      const res = await request(app)
        .get('/api/schools?status=pending')
        .set('x-test-user', JSON.stringify(superAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.schools).toHaveLength(1);
      expect(res.body.data.schools[0].name).toBe('School A');
    });

    it('should return empty array when no schools match filter', async () => {
      const app = buildApp();

      const res = await request(app)
        .get('/api/schools?status=pending')
        .set('x-test-user', JSON.stringify(superAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.schools).toHaveLength(0);
    });
  });

  describe('PATCH /api/schools/:id/approve', () => {
    it('should approve a pending school and generate schoolCode + admin user', async () => {
      const app = buildApp();

      const school = await School.create({
        name: 'Delhi Public School',
        board: 'CBSE',
        address: '123 Main Road',
        totalStudents: 500,
        contactName: 'Dr. Sharma',
        contactEmail: 'principal@dps.edu',
        contactPhone: '9876543210',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/approve`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ abbreviation: 'DPS', cityCode: 'DEL' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.status).toBe('approved');
      expect(res.body.data.school.schoolCode).toBe('DPS-DEL-001');
      expect(res.body.data.adminUserId).toBe('DPS-DEL-001-admin');

      // Verify admin user was created
      const adminUser = await User.findOne({ userId: 'DPS-DEL-001-admin' });
      expect(adminUser).not.toBeNull();
      expect(adminUser.role).toBe('school_admin');
      expect(adminUser.schoolCode).toBe('DPS-DEL-001');
      expect(adminUser.name).toBe('Dr. Sharma');
    });

    it('should return 404 for non-existent school', async () => {
      const app = buildApp();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/schools/${fakeId}/approve`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ abbreviation: 'DPS', cityCode: 'DEL' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for already approved school', async () => {
      const app = buildApp();

      const school = await School.create({
        name: 'Already Approved',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'TST-TST-001',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/approve`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ abbreviation: 'TST', cityCode: 'TST' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when abbreviation is missing', async () => {
      const app = buildApp();
      const school = await School.create({
        name: 'Test School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/approve`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ cityCode: 'DEL' });

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'abbreviation')).toBe(true);
    });

    it('should return 400 when cityCode is missing', async () => {
      const app = buildApp();
      const school = await School.create({
        name: 'Test School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/approve`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ abbreviation: 'DPS' });

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'cityCode')).toBe(true);
    });

    it('should return 400 for invalid MongoDB ID', async () => {
      const app = buildApp();

      const res = await request(app)
        .patch('/api/schools/invalid-id/approve')
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ abbreviation: 'DPS', cityCode: 'DEL' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/schools/:id/reject', () => {
    it('should reject a pending school with a reason', async () => {
      const app = buildApp();

      const school = await School.create({
        name: 'Reject Me School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/reject`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ reason: 'Incomplete documentation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.school.status).toBe('rejected');
      expect(res.body.data.school.rejectionReason).toBe('Incomplete documentation');
    });

    it('should return 404 for non-existent school', async () => {
      const app = buildApp();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/schools/${fakeId}/reject`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ reason: 'Some reason' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for already rejected school', async () => {
      const app = buildApp();

      const school = await School.create({
        name: 'Already Rejected',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'rejected',
        rejectionReason: 'Old reason',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/reject`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({ reason: 'New reason' });

      expect(res.status).toBe(400);
    });

    it('should return 400 when reason is missing', async () => {
      const app = buildApp();
      const school = await School.create({
        name: 'Test School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/schools/${school._id}/reject`)
        .set('x-test-user', JSON.stringify(superAdminUser))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'reason')).toBe(true);
    });
  });

  describe('GET /api/schools/:code', () => {
    it('should return school by code for school_admin', async () => {
      const app = buildApp();

      await School.create({
        name: 'My School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'DPS-DEL-001',
      });

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .get('/api/schools/DPS-DEL-001')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.school.schoolCode).toBe('DPS-DEL-001');
      expect(res.body.data.school.name).toBe('My School');
    });

    it('should return 404 when school code does not match school filter', async () => {
      const app = buildApp();

      await School.create({
        name: 'Other School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'OTH-MUM-001',
      });

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .get('/api/schools/OTH-MUM-001')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent school code', async () => {
      const app = buildApp();

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .get('/api/schools/NONEXISTENT')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/schools/:code', () => {
    it('should update school details', async () => {
      const app = buildApp();

      await School.create({
        name: 'Old Name',
        board: 'CBSE',
        address: 'Old Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'DPS-DEL-001',
      });

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .put('/api/schools/DPS-DEL-001')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ name: 'New Name', totalStudents: 600 });

      expect(res.status).toBe(200);
      expect(res.body.data.school.name).toBe('New Name');
      expect(res.body.data.school.totalStudents).toBe(600);
    });

    it('should not allow updating schoolCode or status', async () => {
      const app = buildApp();

      await School.create({
        name: 'Test School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'DPS-DEL-001',
      });

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .put('/api/schools/DPS-DEL-001')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ schoolCode: 'HACKED-001', status: 'rejected' });

      expect(res.status).toBe(200);
      // schoolCode and status should remain unchanged
      expect(res.body.data.school.schoolCode).toBe('DPS-DEL-001');
      expect(res.body.data.school.status).toBe('approved');
    });

    it('should return 404 when school code does not match school filter', async () => {
      const app = buildApp();

      await School.create({
        name: 'Other School',
        board: 'CBSE',
        address: 'Addr',
        totalStudents: 100,
        contactName: 'A',
        contactEmail: 'a@test.com',
        contactPhone: '1111111111',
        status: 'approved',
        schoolCode: 'OTH-MUM-001',
      });

      const schoolAdminUser = {
        userId: 'DPS-DEL-001-admin',
        role: 'school_admin',
        schoolCode: 'DPS-DEL-001',
        name: 'Admin',
      };

      const res = await request(app)
        .put('/api/schools/OTH-MUM-001')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });
  });
});
