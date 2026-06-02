import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let Teacher;
let User;
let IDCounter;
let teacherController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  teacherController = await import('../../controllers/teacher.controller.js');
  Teacher = mongoose.model('Teacher');
  User = mongoose.model('User');
  IDCounter = mongoose.model('IDCounter');
});

afterEach(async () => {
  await Teacher.deleteMany({});
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

function buildApp() {
  const app = express();
  app.use(express.json());

  // POST /api/teachers
  app.post(
    '/api/teachers',
    injectTestUser,
    injectSchoolFilter,
    teacherController.createTeacherValidation,
    teacherController.createTeacher
  );

  // GET /api/teachers
  app.get(
    '/api/teachers',
    injectTestUser,
    injectSchoolFilter,
    teacherController.listTeachers
  );

  // GET /api/teachers/:id
  app.get(
    '/api/teachers/:id',
    injectTestUser,
    injectSchoolFilter,
    teacherController.getTeacher
  );

  // PUT /api/teachers/:id
  app.put(
    '/api/teachers/:id',
    injectTestUser,
    injectSchoolFilter,
    teacherController.updateTeacher
  );

  // DELETE /api/teachers/:id
  app.delete(
    '/api/teachers/:id',
    injectTestUser,
    injectSchoolFilter,
    teacherController.deactivateTeacher
  );

  return app;
}

const schoolAdminUser = {
  userId: 'DPS-DEL-001-admin',
  role: 'school_admin',
  schoolCode: 'DPS-DEL-001',
  name: 'Admin',
};

function validTeacherData(overrides = {}) {
  return {
    name: 'Priya Sharma',
    email: 'priya@dps.edu',
    phone: '9876543210',
    subjects: ['Mathematics', 'Physics'],
    assignedClasses: [{ class: '10', section: 'A' }],
    ...overrides,
  };
}

describe('Teacher Controller', () => {
  describe('POST /api/teachers (createTeacher)', () => {
    it('should create a teacher with valid data', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacher.name).toBe('Priya Sharma');
      expect(res.body.data.teacher.email).toBe('priya@dps.edu');
      expect(res.body.data.teacher.schoolCode).toBe('DPS-DEL-001');
      expect(res.body.data.teacher.subjects).toEqual(['Mathematics', 'Physics']);
      expect(res.body.data.teacher.assignedClasses).toHaveLength(1);
      expect(res.body.data.teacherId).toMatch(/^DPS-DEL-T-\d{3}$/);
    });

    it('should create a corresponding User record with role teacher', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      expect(res.status).toBe(201);

      const user = await User.findOne({ userId: res.body.data.teacherId });
      expect(user).not.toBeNull();
      expect(user.role).toBe('teacher');
      expect(user.schoolCode).toBe('DPS-DEL-001');
      expect(user.name).toBe('Priya Sharma');
    });

    it('should return 400 when name is missing', async () => {
      const app = buildApp();
      const data = validTeacherData();
      delete data.name;

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'name')).toBe(true);
    });

    it('should return 400 when email is missing', async () => {
      const app = buildApp();
      const data = validTeacherData();
      delete data.email;

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'email')).toBe(true);
    });

    it('should return 400 when email is invalid', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ email: 'not-an-email' }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'email')).toBe(true);
    });

    it('should return 400 when phone is missing', async () => {
      const app = buildApp();
      const data = validTeacherData();
      delete data.phone;

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'phone')).toBe(true);
    });

    it('should return 400 when subjects is empty', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ subjects: [] }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'subjects')).toBe(true);
    });

    it('should return 400 when assignedClasses is empty', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ assignedClasses: [] }));

      expect(res.status).toBe(400);
      expect(
        res.body.error.fields.some((f) => f.field === 'assignedClasses')
      ).toBe(true);
    });

    it('should return 400 when multiple required fields are missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.fields.length).toBeGreaterThanOrEqual(5);
    });

    it('should return 409 for duplicate email within same school', async () => {
      const app = buildApp();

      // Create first teacher
      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      // Attempt to create second teacher with same email
      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ name: 'Another Teacher' }));

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('should allow same email in different schools', async () => {
      const app = buildApp();

      // Create teacher in school 1
      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      // Create teacher with same email in school 2
      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send(validTeacherData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should generate sequential teacher IDs', async () => {
      const app = buildApp();

      const res1 = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ email: 'teacher1@dps.edu' }));

      const res2 = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ email: 'teacher2@dps.edu' }));

      expect(res1.body.data.teacherId).toBe('DPS-DEL-T-001');
      expect(res2.body.data.teacherId).toBe('DPS-DEL-T-002');
    });
  });

  describe('GET /api/teachers (listTeachers)', () => {
    it('should return teachers for the school', async () => {
      const app = buildApp();

      // Create two teachers
      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ email: 'teacher1@dps.edu' }));

      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData({ email: 'teacher2@dps.edu', name: 'Rahul Kumar' }));

      const res = await request(app)
        .get('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teachers).toHaveLength(2);
    });

    it('should return empty array when no teachers exist', async () => {
      const app = buildApp();

      const res = await request(app)
        .get('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.teachers).toHaveLength(0);
    });

    it('should only return teachers from the same school', async () => {
      const app = buildApp();

      // Create teacher in school 1
      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      // Create teacher in school 2
      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };
      await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send(validTeacherData({ email: 'other@oth.edu' }));

      // List teachers for school 1
      const res = await request(app)
        .get('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.body.data.teachers).toHaveLength(1);
      expect(res.body.data.teachers[0].schoolCode).toBe('DPS-DEL-001');
    });
  });

  describe('GET /api/teachers/:id (getTeacher)', () => {
    it('should return teacher by teacherId', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const res = await request(app)
        .get(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.teacher.teacherId).toBe(teacherId);
      expect(res.body.data.teacher.name).toBe('Priya Sharma');
    });

    it('should return 404 for non-existent teacher', async () => {
      const app = buildApp();

      const res = await request(app)
        .get('/api/teachers/DPS-DEL-T-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when teacher belongs to different school', async () => {
      const app = buildApp();

      // Create teacher in school 1
      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      // Try to access from school 2
      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .get(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/teachers/:id (updateTeacher)', () => {
    it('should update allowed teacher fields', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const res = await request(app)
        .put(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({
          name: 'Updated Name',
          phone: '1111111111',
          subjects: ['Chemistry'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.teacher.name).toBe('Updated Name');
      expect(res.body.data.teacher.phone).toBe('1111111111');
      expect(res.body.data.teacher.subjects).toEqual(['Chemistry']);
    });

    it('should not allow updating email or teacherId', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const res = await request(app)
        .put(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ email: 'hacked@evil.com', teacherId: 'HACKED-001' });

      expect(res.status).toBe(200);
      expect(res.body.data.teacher.email).toBe('priya@dps.edu');
      expect(res.body.data.teacher.teacherId).toBe(teacherId);
    });

    it('should return 404 for non-existent teacher', async () => {
      const app = buildApp();

      const res = await request(app)
        .put('/api/teachers/DPS-DEL-T-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when teacher belongs to different school', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .put(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/teachers/:id (deactivateTeacher)', () => {
    it('should deactivate teacher and user records', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const res = await request(app)
        .delete(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.teacher.isActive).toBe(false);

      // Verify User record is also deactivated
      const user = await User.findOne({ userId: teacherId });
      expect(user.isActive).toBe(false);
    });

    it('should return 404 for non-existent teacher', async () => {
      const app = buildApp();

      const res = await request(app)
        .delete('/api/teachers/DPS-DEL-T-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when teacher belongs to different school', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/teachers')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validTeacherData());

      const teacherId = createRes.body.data.teacherId;

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .delete(`/api/teachers/${teacherId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin));

      expect(res.status).toBe(404);
    });
  });
});
