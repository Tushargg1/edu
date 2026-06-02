import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let Student;
let User;
let IDCounter;
let studentController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  studentController = await import('../../controllers/student.controller.js');
  Student = mongoose.model('Student');
  User = mongoose.model('User');
  IDCounter = mongoose.model('IDCounter');
});

afterEach(async () => {
  await Student.deleteMany({});
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
  app.use(express.text({ type: 'text/csv' }));

  // POST /api/students
  app.post(
    '/api/students',
    injectTestUser,
    injectSchoolFilter,
    studentController.createStudentValidation,
    studentController.createStudent
  );

  // POST /api/students/bulk
  app.post(
    '/api/students/bulk',
    injectTestUser,
    injectSchoolFilter,
    studentController.bulkCreateStudents
  );

  // GET /api/students
  app.get(
    '/api/students',
    injectTestUser,
    injectSchoolFilter,
    studentController.listStudents
  );

  // GET /api/students/:id
  app.get(
    '/api/students/:id',
    injectTestUser,
    injectSchoolFilter,
    studentController.getStudent
  );

  // PUT /api/students/:id
  app.put(
    '/api/students/:id',
    injectTestUser,
    injectSchoolFilter,
    studentController.updateStudent
  );

  // DELETE /api/students/:id
  app.delete(
    '/api/students/:id',
    injectTestUser,
    injectSchoolFilter,
    studentController.deactivateStudent
  );

  return app;
}

const schoolAdminUser = {
  userId: 'DPS-DEL-001-admin',
  role: 'school_admin',
  schoolCode: 'DPS-DEL-001',
  name: 'Admin',
};

function validStudentData(overrides = {}) {
  return {
    name: 'Aarav Patel',
    class: '10',
    section: 'A',
    rollNumber: '01',
    dob: '2008-05-15',
    gender: 'male',
    parentName: 'Rajesh Patel',
    parentPhone: '9876543210',
    parentEmail: 'rajesh@example.com',
    admissionYear: 2024,
    ...overrides,
  };
}

describe('Student Controller', () => {
  describe('POST /api/students (createStudent)', () => {
    it('should create a student with valid data', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.name).toBe('Aarav Patel');
      expect(res.body.data.student.class).toBe('10');
      expect(res.body.data.student.section).toBe('A');
      expect(res.body.data.student.rollNumber).toBe('01');
      expect(res.body.data.student.schoolCode).toBe('DPS-DEL-001');
      expect(res.body.data.studentId).toMatch(/^DPS-DEL-S-2024-\d{3}$/);
    });

    it('should create a corresponding User record with role student', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      expect(res.status).toBe(201);

      const user = await User.findOne({ userId: res.body.data.studentId });
      expect(user).not.toBeNull();
      expect(user.role).toBe('student');
      expect(user.schoolCode).toBe('DPS-DEL-001');
      expect(user.name).toBe('Aarav Patel');
    });

    it('should return 400 when name is missing', async () => {
      const app = buildApp();
      const data = validStudentData();
      delete data.name;

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'name')).toBe(true);
    });

    it('should return 400 when class is missing', async () => {
      const app = buildApp();
      const data = validStudentData();
      delete data.class;

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(data);

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'class')).toBe(true);
    });

    it('should return 400 when gender is invalid', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ gender: 'invalid' }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'gender')).toBe(true);
    });

    it('should return 400 when parentEmail is invalid', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ parentEmail: 'not-an-email' }));

      expect(res.status).toBe(400);
      expect(res.body.error.fields.some((f) => f.field === 'parentEmail')).toBe(true);
    });

    it('should return 400 when multiple required fields are missing', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.fields.length).toBeGreaterThanOrEqual(5);
    });

    it('should return 409 for duplicate rollNumber within same class+section+school', async () => {
      const app = buildApp();

      // Create first student
      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      // Attempt to create second student with same rollNumber in same class+section
      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ name: 'Another Student', parentEmail: 'other@example.com' }));

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    });

    it('should allow same rollNumber in different sections', async () => {
      const app = buildApp();

      // Create student in section A
      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      // Create student with same rollNumber in section B
      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ section: 'B', parentEmail: 'other@example.com' }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow same rollNumber in different schools', async () => {
      const app = buildApp();

      // Create student in school 1
      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      // Create student with same rollNumber in school 2
      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send(validStudentData());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should generate sequential student IDs', async () => {
      const app = buildApp();

      const res1 = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ rollNumber: '01' }));

      const res2 = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ rollNumber: '02', parentEmail: 'other@example.com' }));

      expect(res1.body.data.studentId).toBe('DPS-DEL-S-2024-001');
      expect(res2.body.data.studentId).toBe('DPS-DEL-S-2024-002');
    });
  });

  describe('POST /api/students/bulk (bulkCreateStudents)', () => {
    it('should create students from valid CSV data', async () => {
      const app = buildApp();
      const csvData = [
        'name,class,section,rollNumber,dob,gender,parentName,parentPhone,parentEmail,admissionYear',
        'Student One,10,A,01,2008-01-01,male,Parent One,9876543210,parent1@example.com,2024',
        'Student Two,10,A,02,2008-02-02,female,Parent Two,9876543211,parent2@example.com,2024',
      ].join('\n');

      const res = await request(app)
        .post('/api/students/bulk')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ csvData });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total).toBe(2);
      expect(res.body.data.summary.success).toBe(2);
      expect(res.body.data.summary.failed).toBe(0);
      expect(res.body.data.created).toHaveLength(2);
      expect(res.body.data.errors).toHaveLength(0);
    });

    it('should report errors for invalid rows and create valid ones', async () => {
      const app = buildApp();
      const csvData = [
        'name,class,section,rollNumber,dob,gender,parentName,parentPhone,parentEmail,admissionYear',
        'Valid Student,10,A,01,2008-01-01,male,Parent One,9876543210,parent1@example.com,2024',
        ',10,A,02,2008-02-02,male,Parent Two,9876543211,parent2@example.com,2024',
      ].join('\n');

      const res = await request(app)
        .post('/api/students/bulk')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ csvData });

      expect(res.status).toBe(200);
      expect(res.body.data.summary.success).toBe(1);
      expect(res.body.data.summary.failed).toBeGreaterThanOrEqual(1);
      expect(res.body.data.errors.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.errors[0]).toContain('Row 3');
    });

    it('should report duplicate rollNumber errors in bulk upload', async () => {
      const app = buildApp();
      const csvData = [
        'name,class,section,rollNumber,dob,gender,parentName,parentPhone,parentEmail,admissionYear',
        'Student One,10,A,01,2008-01-01,male,Parent One,9876543210,parent1@example.com,2024',
        'Student Two,10,A,01,2008-02-02,female,Parent Two,9876543211,parent2@example.com,2024',
      ].join('\n');

      const res = await request(app)
        .post('/api/students/bulk')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ csvData });

      expect(res.status).toBe(200);
      expect(res.body.data.summary.success).toBe(1);
      expect(res.body.data.summary.failed).toBe(1);
      expect(res.body.data.errors[0]).toContain('Duplicate roll number');
    });

    it('should return 400 when no CSV data is provided', async () => {
      const app = buildApp();

      const res = await request(app)
        .post('/api/students/bulk')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty CSV (no data rows)', async () => {
      const app = buildApp();
      const csvData = 'name,class,section,rollNumber,dob,gender,parentName,parentPhone,parentEmail,admissionYear\n';

      const res = await request(app)
        .post('/api/students/bulk')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ csvData });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/students (listStudents)', () => {
    it('should return students for the school', async () => {
      const app = buildApp();

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ rollNumber: '01' }));

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ rollNumber: '02', name: 'Priya Singh', parentEmail: 'priya@example.com' }));

      const res = await request(app)
        .get('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.students).toHaveLength(2);
    });

    it('should return empty array when no students exist', async () => {
      const app = buildApp();

      const res = await request(app)
        .get('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.students).toHaveLength(0);
    });

    it('should filter students by class query param', async () => {
      const app = buildApp();

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ class: '10', rollNumber: '01' }));

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ class: '9', rollNumber: '01', parentEmail: 'other@example.com' }));

      const res = await request(app)
        .get('/api/students?class=10')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].class).toBe('10');
    });

    it('should filter students by section query param', async () => {
      const app = buildApp();

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ section: 'A', rollNumber: '01' }));

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData({ section: 'B', rollNumber: '01', parentEmail: 'other@example.com' }));

      const res = await request(app)
        .get('/api/students?section=A')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].section).toBe('A');
    });

    it('should only return students from the same school', async () => {
      const app = buildApp();

      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };
      await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send(validStudentData({ parentEmail: 'other@example.com' }));

      const res = await request(app)
        .get('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.students[0].schoolCode).toBe('DPS-DEL-001');
    });
  });

  describe('GET /api/students/:id (getStudent)', () => {
    it('should return student by studentId', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const res = await request(app)
        .get(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.student.studentId).toBe(studentId);
      expect(res.body.data.student.name).toBe('Aarav Patel');
    });

    it('should return 404 for non-existent student', async () => {
      const app = buildApp();

      const res = await request(app)
        .get('/api/students/DPS-DEL-S-2024-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when student belongs to different school', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .get(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/students/:id (updateStudent)', () => {
    it('should update allowed student fields', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const res = await request(app)
        .put(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({
          name: 'Updated Name',
          parentPhone: '1111111111',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.student.name).toBe('Updated Name');
      expect(res.body.data.student.parentPhone).toBe('1111111111');
    });

    it('should not allow updating studentId or schoolCode', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const res = await request(app)
        .put(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ studentId: 'HACKED-001', schoolCode: 'HACKED-SCHOOL' });

      expect(res.status).toBe(200);
      expect(res.body.data.student.studentId).toBe(studentId);
      expect(res.body.data.student.schoolCode).toBe('DPS-DEL-001');
    });

    it('should return 404 for non-existent student', async () => {
      const app = buildApp();

      const res = await request(app)
        .put('/api/students/DPS-DEL-S-2024-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when student belongs to different school', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .put(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin))
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/students/:id (deactivateStudent)', () => {
    it('should deactivate student and user records', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const res = await request(app)
        .delete(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.data.student.isActive).toBe(false);

      // Verify User record is also deactivated
      const user = await User.findOne({ userId: studentId });
      expect(user.isActive).toBe(false);
    });

    it('should return 404 for non-existent student', async () => {
      const app = buildApp();

      const res = await request(app)
        .delete('/api/students/DPS-DEL-S-2024-999')
        .set('x-test-user', JSON.stringify(schoolAdminUser));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when student belongs to different school', async () => {
      const app = buildApp();

      const createRes = await request(app)
        .post('/api/students')
        .set('x-test-user', JSON.stringify(schoolAdminUser))
        .send(validStudentData());

      const studentId = createRes.body.data.studentId;

      const otherSchoolAdmin = {
        userId: 'OTH-MUM-001-admin',
        role: 'school_admin',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Admin',
      };

      const res = await request(app)
        .delete(`/api/students/${studentId}`)
        .set('x-test-user', JSON.stringify(otherSchoolAdmin));

      expect(res.status).toBe(404);
    });
  });
});
