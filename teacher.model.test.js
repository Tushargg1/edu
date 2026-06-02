import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let Attendance;
let Teacher;
let Student;
let User;
let attendanceController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  attendanceController = await import('../../controllers/attendance.controller.js');
  Attendance = mongoose.model('Attendance');
  Teacher = mongoose.model('Teacher');
  Student = mongoose.model('Student');
  User = mongoose.model('User');
});

afterEach(async () => {
  await Attendance.deleteMany({});
  await Teacher.deleteMany({});
  await Student.deleteMany({});
  await User.deleteMany({});
  studentCounter = 0;
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

  // POST /api/attendance
  app.post(
    '/api/attendance',
    injectTestUser,
    injectSchoolFilter,
    attendanceController.submitAttendanceValidation,
    attendanceController.submitAttendance
  );

  // GET /api/attendance
  app.get(
    '/api/attendance',
    injectTestUser,
    injectSchoolFilter,
    attendanceController.getAttendance
  );

  // GET /api/attendance/student/:id
  app.get(
    '/api/attendance/student/:id',
    injectTestUser,
    injectSchoolFilter,
    attendanceController.getStudentAttendance
  );

  // GET /api/attendance/report/:class
  app.get(
    '/api/attendance/report/:class',
    injectTestUser,
    injectSchoolFilter,
    attendanceController.getClassReport
  );

  // PATCH /api/attendance/:id
  app.patch(
    '/api/attendance/:id',
    injectTestUser,
    injectSchoolFilter,
    attendanceController.updateAttendanceValidation,
    attendanceController.updateAttendance
  );

  return app;
}

const SCHOOL_CODE = 'DPS-DEL-001';

// Helper: create a teacher user + teacher record and return the test user header object
async function createTeacherWithClasses(assignedClasses, overrides = {}) {
  const user = await User.create({
    userId: overrides.teacherId || 'DPS-DEL-T-001',
    schoolCode: SCHOOL_CODE,
    role: 'teacher',
    password: 'temppass1',
    name: overrides.name || 'Test Teacher',
    email: overrides.email || 'teacher@dps.edu',
    phone: '9876543210',
  });

  await Teacher.create({
    teacherId: overrides.teacherId || 'DPS-DEL-T-001',
    schoolCode: SCHOOL_CODE,
    userId: user._id,
    name: overrides.name || 'Test Teacher',
    email: overrides.email || 'teacher@dps.edu',
    phone: '9876543210',
    subjects: ['Mathematics'],
    assignedClasses,
  });

  return {
    userId: user.userId,
    _id: user._id.toString(),
    role: 'teacher',
    schoolCode: SCHOOL_CODE,
    name: user.name,
  };
}

// Counter to ensure unique student IDs across calls
let studentCounter = 0;

// Helper: create student records
async function createStudents(className, section, count) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    studentCounter++;
    const studentId = `DPS-DEL-S-2024-${String(studentCounter).padStart(3, '0')}`;
    const user = await User.create({
      userId: studentId,
      schoolCode: SCHOOL_CODE,
      role: 'student',
      password: 'temppass1',
      name: `Student ${studentCounter}`,
      email: `student${studentCounter}@parent.com`,
      phone: `98765${String(studentCounter).padStart(5, '0')}`,
    });

    const student = await Student.create({
      studentId,
      schoolCode: SCHOOL_CODE,
      userId: user._id,
      name: `Student ${studentCounter}`,
      class: className,
      section,
      rollNumber: String(i),
      dob: new Date('2010-01-01'),
      gender: 'male',
      parentName: `Parent ${studentCounter}`,
      parentPhone: `98765${String(studentCounter).padStart(5, '0')}`,
      parentEmail: `student${studentCounter}@parent.com`,
      admissionYear: 2024,
    });

    students.push(student);
  }
  return students;
}

function validAttendanceData(studentIds, overrides = {}) {
  return {
    class: '10',
    section: 'A',
    date: '2024-12-01',
    records: studentIds.map((id, idx) => ({
      studentId: id,
      status: idx === 0 ? 'absent' : 'present',
    })),
    ...overrides,
  };
}

describe('Attendance Controller', () => {
  describe('POST /api/attendance (submitAttendance)', () => {
    it('should submit attendance with valid data', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 3);
      const studentIds = students.map((s) => s.studentId);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentIds));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance.class).toBe('10');
      expect(res.body.data.attendance.section).toBe('A');
      expect(res.body.data.attendance.records).toHaveLength(3);
      expect(res.body.data.attendance.schoolCode).toBe(SCHOOL_CODE);
    });

    it('should return 403 when teacher is not assigned to the class', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '9', section: 'B' }]);
      const students = await createStudents('10', 'A', 2);
      const studentIds = students.map((s) => s.studentId);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentIds));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should upsert when attendance already exists for same class-section-date', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 2);
      const studentIds = students.map((s) => s.studentId);

      // First submission
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentIds));

      // Second submission with different statuses
      const updatedRecords = studentIds.map((id) => ({
        studentId: id,
        status: 'late',
      }));

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          class: '10',
          section: 'A',
          date: '2024-12-01',
          records: updatedRecords,
        });

      expect(res.status).toBe(201);

      // Verify only one record exists
      const count = await Attendance.countDocuments({
        schoolCode: SCHOOL_CODE,
        class: '10',
        section: 'A',
      });
      expect(count).toBe(1);

      // Verify records are updated
      expect(res.body.data.attendance.records.every((r) => r.status === 'late')).toBe(true);
    });

    it('should return 400 when class is missing', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          section: 'A',
          date: '2024-12-01',
          records: [{ studentId: 'S-001', status: 'present' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.some((f) => f.field === 'class')).toBe(true);
    });

    it('should return 400 when records is empty', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          class: '10',
          section: 'A',
          date: '2024-12-01',
          records: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when record has invalid status', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          class: '10',
          section: 'A',
          date: '2024-12-01',
          records: [{ studentId: 'S-001', status: 'invalid' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should set markedBy to the teacher user _id', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);

      const res = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(students.map((s) => s.studentId)));

      expect(res.status).toBe(201);
      expect(res.body.data.attendance.markedBy).toBe(teacherUser._id);
    });
  });

  describe('GET /api/attendance (getAttendance)', () => {
    it('should return attendance records filtered by class/section/date', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([
        { class: '10', section: 'A' },
        { class: '10', section: 'B' },
      ]);
      const studentsA = await createStudents('10', 'A', 2);
      const studentsB = await createStudents('10', 'B', 2);

      // Submit attendance for section A
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentsA.map((s) => s.studentId)));

      // Submit attendance for section B
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentsB.map((s) => s.studentId), {
          class: '10',
          section: 'B',
        }));

      // Query for section A only
      const res = await request(app)
        .get('/api/attendance?class=10&section=A&date=2024-12-01')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.records[0].section).toBe('A');
    });

    it('should return empty array when no records match', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .get('/api/attendance?class=10&section=A&date=2024-12-01')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(0);
    });

    it('should scope results to the school', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);

      // Submit attendance
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(students.map((s) => s.studentId)));

      // Query from a different school
      const otherSchoolUser = {
        userId: 'OTH-MUM-T-001',
        _id: new mongoose.Types.ObjectId().toString(),
        role: 'teacher',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Teacher',
      };

      const res = await request(app)
        .get('/api/attendance?class=10&section=A')
        .set('x-test-user', JSON.stringify(otherSchoolUser));

      expect(res.status).toBe(200);
      expect(res.body.data.records).toHaveLength(0);
    });
  });

  describe('GET /api/attendance/student/:id (getStudentAttendance)', () => {
    it('should return month-by-month attendance history', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);
      const studentId = students[0].studentId;

      // Submit attendance for multiple dates
      const dates = ['2024-12-01', '2024-12-02', '2024-12-03'];
      const statuses = ['present', 'absent', 'late'];

      for (let i = 0; i < dates.length; i++) {
        await request(app)
          .post('/api/attendance')
          .set('x-test-user', JSON.stringify(teacherUser))
          .send({
            class: '10',
            section: 'A',
            date: dates[i],
            records: [{ studentId, status: statuses[i] }],
          });
      }

      const res = await request(app)
        .get(`/api/attendance/student/${studentId}`)
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe(studentId);
      expect(res.body.data.months).toHaveLength(1);

      const month = res.body.data.months[0];
      expect(month.month).toBe('2024-12');
      expect(month.present).toBe(1);
      expect(month.absent).toBe(1);
      expect(month.late).toBe(1);
      expect(month.total).toBe(3);
      // (present + late) / total = (1 + 1) / 3 = 66.67%
      expect(month.percentage).toBeCloseTo(66.67, 1);
    });

    it('should compute cumulative attendance percentage correctly', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);
      const studentId = students[0].studentId;

      // 4 days: 2 present, 1 absent, 1 late
      const entries = [
        { date: '2024-11-28', status: 'present' },
        { date: '2024-11-29', status: 'present' },
        { date: '2024-12-01', status: 'absent' },
        { date: '2024-12-02', status: 'late' },
      ];

      for (const entry of entries) {
        await request(app)
          .post('/api/attendance')
          .set('x-test-user', JSON.stringify(teacherUser))
          .send({
            class: '10',
            section: 'A',
            date: entry.date,
            records: [{ studentId, status: entry.status }],
          });
      }

      const res = await request(app)
        .get(`/api/attendance/student/${studentId}`)
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.months).toHaveLength(2); // Nov and Dec

      const cumulative = res.body.data.cumulative;
      expect(cumulative.present).toBe(2);
      expect(cumulative.absent).toBe(1);
      expect(cumulative.late).toBe(1);
      expect(cumulative.total).toBe(4);
      // (2 + 1) / 4 = 75%
      expect(cumulative.percentage).toBe(75);
    });

    it('should return empty data for student with no attendance', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .get('/api/attendance/student/DPS-DEL-S-2024-999')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.months).toHaveLength(0);
      expect(res.body.data.cumulative.total).toBe(0);
      expect(res.body.data.cumulative.percentage).toBe(0);
    });
  });

  describe('PATCH /api/attendance/:id (updateAttendance)', () => {
    it('should update an existing attendance record', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 2);
      const studentIds = students.map((s) => s.studentId);

      // Submit initial attendance
      const createRes = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(studentIds));

      const attendanceId = createRes.body.data.attendance._id;

      // Update: change all to late
      const updatedRecords = studentIds.map((id) => ({
        studentId: id,
        status: 'late',
      }));

      const res = await request(app)
        .patch(`/api/attendance/${attendanceId}`)
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({ records: updatedRecords });

      expect(res.status).toBe(200);
      expect(res.body.data.attendance.records.every((r) => r.status === 'late')).toBe(true);
    });

    it('should return 404 for non-existent attendance record', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/attendance/${fakeId}`)
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({ records: [{ studentId: 'S-001', status: 'present' }] });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when records is empty', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/attendance/${fakeId}`)
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({ records: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when attendance belongs to different school', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);

      // Submit attendance
      const createRes = await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send(validAttendanceData(students.map((s) => s.studentId)));

      const attendanceId = createRes.body.data.attendance._id;

      // Try to update from different school
      const otherSchoolUser = {
        userId: 'OTH-MUM-T-001',
        _id: new mongoose.Types.ObjectId().toString(),
        role: 'teacher',
        schoolCode: 'OTH-MUM-001',
        name: 'Other Teacher',
      };

      const res = await request(app)
        .patch(`/api/attendance/${attendanceId}`)
        .set('x-test-user', JSON.stringify(otherSchoolUser))
        .send({ records: [{ studentId: students[0].studentId, status: 'present' }] });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/attendance/report/:class (getClassReport)', () => {
    it('should return per-student attendance totals and percentages', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 2);
      const [s1, s2] = students;

      // Day 1: s1 present, s2 absent
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          class: '10',
          section: 'A',
          date: '2024-12-01',
          records: [
            { studentId: s1.studentId, status: 'present' },
            { studentId: s2.studentId, status: 'absent' },
          ],
        });

      // Day 2: s1 present, s2 present
      await request(app)
        .post('/api/attendance')
        .set('x-test-user', JSON.stringify(teacherUser))
        .send({
          class: '10',
          section: 'A',
          date: '2024-12-02',
          records: [
            { studentId: s1.studentId, status: 'present' },
            { studentId: s2.studentId, status: 'present' },
          ],
        });

      const res = await request(app)
        .get('/api/attendance/report/10?section=A')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.class).toBe('10');
      expect(res.body.data.report).toHaveLength(2);

      const s1Report = res.body.data.report.find((r) => r.studentId === s1.studentId);
      expect(s1Report.present).toBe(2);
      expect(s1Report.absent).toBe(0);
      expect(s1Report.percentage).toBe(100);
      expect(s1Report.belowThreshold).toBe(false);

      const s2Report = res.body.data.report.find((r) => r.studentId === s2.studentId);
      expect(s2Report.present).toBe(1);
      expect(s2Report.absent).toBe(1);
      expect(s2Report.percentage).toBe(50);
      expect(s2Report.belowThreshold).toBe(true);
    });

    it('should flag students below 75% attendance', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);
      const studentId = students[0].studentId;

      // 4 days: 2 present, 2 absent = 50%
      const dates = ['2024-12-01', '2024-12-02', '2024-12-03', '2024-12-04'];
      const statuses = ['present', 'present', 'absent', 'absent'];

      for (let i = 0; i < dates.length; i++) {
        await request(app)
          .post('/api/attendance')
          .set('x-test-user', JSON.stringify(teacherUser))
          .send({
            class: '10',
            section: 'A',
            date: dates[i],
            records: [{ studentId, status: statuses[i] }],
          });
      }

      const res = await request(app)
        .get('/api/attendance/report/10?section=A')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      const report = res.body.data.report[0];
      expect(report.percentage).toBe(50);
      expect(report.belowThreshold).toBe(true);
    });

    it('should not flag students at exactly 75%', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);
      const students = await createStudents('10', 'A', 1);
      const studentId = students[0].studentId;

      // 4 days: 3 present, 1 absent = 75%
      const dates = ['2024-12-01', '2024-12-02', '2024-12-03', '2024-12-04'];
      const statuses = ['present', 'present', 'present', 'absent'];

      for (let i = 0; i < dates.length; i++) {
        await request(app)
          .post('/api/attendance')
          .set('x-test-user', JSON.stringify(teacherUser))
          .send({
            class: '10',
            section: 'A',
            date: dates[i],
            records: [{ studentId, status: statuses[i] }],
          });
      }

      const res = await request(app)
        .get('/api/attendance/report/10?section=A')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      const report = res.body.data.report[0];
      expect(report.percentage).toBe(75);
      expect(report.belowThreshold).toBe(false);
    });

    it('should return empty report when no attendance exists', async () => {
      const app = buildApp();
      const teacherUser = await createTeacherWithClasses([{ class: '10', section: 'A' }]);

      const res = await request(app)
        .get('/api/attendance/report/10?section=A')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(res.status).toBe(200);
      expect(res.body.data.report).toHaveLength(0);
      expect(res.body.data.totalRecords).toBe(0);
    });
  });
});
