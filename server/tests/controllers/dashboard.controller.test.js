import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let Teacher;
let Student;
let Attendance;
let CalendarEvent;
let User;
let Notification;
let dashboardController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  dashboardController = await import('../../controllers/dashboard.controller.js');
  Teacher = mongoose.model('Teacher');
  Student = mongoose.model('Student');
  Attendance = mongoose.model('Attendance');
  CalendarEvent = mongoose.model('CalendarEvent');
  User = mongoose.model('User');
  Notification = mongoose.model('Notification');
});

afterEach(async () => {
  await Teacher.deleteMany({});
  await Student.deleteMany({});
  await Attendance.deleteMany({});
  await CalendarEvent.deleteMany({});
  await User.deleteMany({});
  await Notification.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.NODE_ENV;
});

function injectTestUser(req, res, next) {
  if (req.headers['x-test-user']) {
    req.user = JSON.parse(req.headers['x-test-user']);
  }
  next();
}

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

  app.get(
    '/api/dashboard/admin',
    injectTestUser,
    injectSchoolFilter,
    dashboardController.adminDashboard
  );

  app.get(
    '/api/dashboard/teacher',
    injectTestUser,
    injectSchoolFilter,
    dashboardController.teacherDashboard
  );

  app.get(
    '/api/dashboard/student',
    injectTestUser,
    injectSchoolFilter,
    dashboardController.studentDashboard
  );

  return app;
}

const SCHOOL_CODE = 'DPS-DEL-001';

function adminUser(overrides = {}) {
  return {
    userId: 'DPS-DEL-ADM-001',
    _id: overrides._id || new mongoose.Types.ObjectId().toString(),
    role: 'school_admin',
    schoolCode: SCHOOL_CODE,
    name: 'Admin User',
    ...overrides,
  };
}

describe('Dashboard Controller', () => {
  describe('GET /api/dashboard/admin (adminDashboard)', () => {
    it('should return dashboard data with correct totals', async () => {
      const app = buildApp();
      const user = adminUser();

      // Create teachers
      const teacherUserId = new mongoose.Types.ObjectId();
      await Teacher.create({
        teacherId: 'DPS-DEL-T-001',
        schoolCode: SCHOOL_CODE,
        userId: teacherUserId,
        name: 'Teacher 1',
        email: 'teacher1@test.com',
        isActive: true,
      });

      // Create students
      const studentUserId = new mongoose.Types.ObjectId();
      await Student.create({
        studentId: 'DPS-DEL-S-2024-001',
        schoolCode: SCHOOL_CODE,
        userId: studentUserId,
        name: 'Student 1',
        class: '10',
        section: 'A',
        rollNumber: '1',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTeachers).toBe(1);
      expect(res.body.data.totalStudents).toBe(1);
      expect(res.body.data.todayAttendancePercentage).toBeDefined();
      expect(res.body.data.upcomingEvents).toBeDefined();
      expect(res.body.data.recentAccounts).toBeDefined();
    });

    it('should compute today attendance percentage correctly', async () => {
      const app = buildApp();
      const user = adminUser();

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await Attendance.create({
        schoolCode: SCHOOL_CODE,
        class: '10',
        section: 'A',
        date: today,
        markedBy: new mongoose.Types.ObjectId(),
        records: [
          { studentId: 'S-001', status: 'present' },
          { studentId: 'S-002', status: 'absent' },
          { studentId: 'S-003', status: 'late' },
          { studentId: 'S-004', status: 'present' },
        ],
      });

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      // 3 present+late out of 4 = 75%
      expect(res.body.data.todayAttendancePercentage).toBe(75);
    });

    it('should return 0 attendance percentage when no records exist', async () => {
      const app = buildApp();
      const user = adminUser();

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.todayAttendancePercentage).toBe(0);
    });

    it('should return upcoming events sorted by startDate', async () => {
      const app = buildApp();
      const user = adminUser();

      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 5);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 10);

      await CalendarEvent.create([
        {
          schoolCode: SCHOOL_CODE,
          title: 'Later Event',
          eventType: 'Exam',
          startDate: futureDate2,
          endDate: futureDate2,
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          schoolCode: SCHOOL_CODE,
          title: 'Sooner Event',
          eventType: 'Holiday',
          startDate: futureDate1,
          endDate: futureDate1,
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.upcomingEvents).toHaveLength(2);
      expect(res.body.data.upcomingEvents[0].title).toBe('Sooner Event');
    });

    it('should not include inactive teachers or students in totals', async () => {
      const app = buildApp();
      const user = adminUser();

      await Teacher.create({
        teacherId: 'DPS-DEL-T-010',
        schoolCode: SCHOOL_CODE,
        userId: new mongoose.Types.ObjectId(),
        name: 'Inactive Teacher',
        email: 'inactive@test.com',
        isActive: false,
      });

      await Student.create({
        studentId: 'DPS-DEL-S-2024-010',
        schoolCode: SCHOOL_CODE,
        userId: new mongoose.Types.ObjectId(),
        name: 'Inactive Student',
        class: '10',
        section: 'A',
        rollNumber: '10',
        isActive: false,
      });

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.totalTeachers).toBe(0);
      expect(res.body.data.totalStudents).toBe(0);
    });

    it('should scope data to the admin school only', async () => {
      const app = buildApp();
      const user = adminUser();

      await Teacher.create([
        {
          teacherId: 'DPS-DEL-T-020',
          schoolCode: SCHOOL_CODE,
          userId: new mongoose.Types.ObjectId(),
          name: 'Our Teacher',
          email: 'our@test.com',
          isActive: true,
        },
        {
          teacherId: 'OTH-MUM-T-001',
          schoolCode: 'OTH-MUM-001',
          userId: new mongoose.Types.ObjectId(),
          name: 'Other Teacher',
          email: 'other@test.com',
          isActive: true,
        },
      ]);

      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.totalTeachers).toBe(1);
    });
  });

  describe('GET /api/dashboard/teacher (teacherDashboard)', () => {
    it('should return assigned classes with attendance status', async () => {
      const app = buildApp();
      const teacherObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-T-001',
        _id: teacherObjId.toString(),
        role: 'teacher',
        schoolCode: SCHOOL_CODE,
        name: 'Teacher',
      };

      await Teacher.create({
        teacherId: 'DPS-DEL-T-001',
        schoolCode: SCHOOL_CODE,
        userId: teacherObjId,
        name: 'Teacher',
        email: 'teacher@test.com',
        assignedClasses: [
          { class: '10', section: 'A' },
          { class: '10', section: 'B' },
        ],
      });

      // Mark attendance for one class today
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      await Attendance.create({
        schoolCode: SCHOOL_CODE,
        class: '10',
        section: 'A',
        date: today,
        markedBy: teacherObjId,
        records: [{ studentId: 'S-001', status: 'present' }],
      });

      const res = await request(app)
        .get('/api/dashboard/teacher')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedClasses).toHaveLength(2);

      const classA = res.body.data.assignedClasses.find(
        (c) => c.class === '10' && c.section === 'A'
      );
      const classB = res.body.data.assignedClasses.find(
        (c) => c.class === '10' && c.section === 'B'
      );

      expect(classA.attendanceMarked).toBe(true);
      expect(classB.attendanceMarked).toBe(false);
    });

    it('should return 404 when teacher record not found', async () => {
      const app = buildApp();
      const user = {
        userId: 'DPS-DEL-T-999',
        _id: new mongoose.Types.ObjectId().toString(),
        role: 'teacher',
        schoolCode: SCHOOL_CODE,
        name: 'Unknown Teacher',
      };

      const res = await request(app)
        .get('/api/dashboard/teacher')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return upcoming events', async () => {
      const app = buildApp();
      const teacherObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-T-002',
        _id: teacherObjId.toString(),
        role: 'teacher',
        schoolCode: SCHOOL_CODE,
        name: 'Teacher',
      };

      await Teacher.create({
        teacherId: 'DPS-DEL-T-002',
        schoolCode: SCHOOL_CODE,
        userId: teacherObjId,
        name: 'Teacher',
        email: 'teacher2@test.com',
        assignedClasses: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Upcoming PTM',
        eventType: 'PTM',
        startDate: futureDate,
        endDate: futureDate,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .get('/api/dashboard/teacher')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.upcomingEvents).toHaveLength(1);
      expect(res.body.data.upcomingEvents[0].title).toBe('Upcoming PTM');
    });
  });

  describe('GET /api/dashboard/student (studentDashboard)', () => {
    it('should return current month attendance summary', async () => {
      const app = buildApp();
      const studentObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-S-2024-001',
        _id: studentObjId.toString(),
        role: 'student',
        schoolCode: SCHOOL_CODE,
        name: 'Student',
      };

      await Student.create({
        studentId: 'DPS-DEL-S-2024-001',
        schoolCode: SCHOOL_CODE,
        userId: studentObjId,
        name: 'Student',
        class: '10',
        section: 'A',
        rollNumber: '1',
      });

      // Create attendance records for current month
      const now = new Date();
      const day1 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const day2 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2));
      const day3 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 3));

      await Attendance.create([
        {
          schoolCode: SCHOOL_CODE,
          class: '10',
          section: 'A',
          date: day1,
          markedBy: new mongoose.Types.ObjectId(),
          records: [{ studentId: 'DPS-DEL-S-2024-001', status: 'present' }],
        },
        {
          schoolCode: SCHOOL_CODE,
          class: '10',
          section: 'A',
          date: day2,
          markedBy: new mongoose.Types.ObjectId(),
          records: [{ studentId: 'DPS-DEL-S-2024-001', status: 'absent' }],
        },
        {
          schoolCode: SCHOOL_CODE,
          class: '10',
          section: 'A',
          date: day3,
          markedBy: new mongoose.Types.ObjectId(),
          records: [{ studentId: 'DPS-DEL-S-2024-001', status: 'late' }],
        },
      ]);

      const res = await request(app)
        .get('/api/dashboard/student')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance.present).toBe(1);
      expect(res.body.data.attendance.absent).toBe(1);
      expect(res.body.data.attendance.late).toBe(1);
      expect(res.body.data.attendance.total).toBe(3);
      // (present + late) / total = 2/3 = 66.67%
      expect(res.body.data.attendance.percentage).toBe(66.67);
    });

    it('should return 404 when student record not found', async () => {
      const app = buildApp();
      const user = {
        userId: 'DPS-DEL-S-2024-999',
        _id: new mongoose.Types.ObjectId().toString(),
        role: 'student',
        schoolCode: SCHOOL_CODE,
        name: 'Unknown Student',
      };

      const res = await request(app)
        .get('/api/dashboard/student')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return recent notifications for the student', async () => {
      const app = buildApp();
      const studentObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-S-2024-002',
        _id: studentObjId.toString(),
        role: 'student',
        schoolCode: SCHOOL_CODE,
        name: 'Student 2',
      };

      await Student.create({
        studentId: 'DPS-DEL-S-2024-002',
        schoolCode: SCHOOL_CODE,
        userId: studentObjId,
        name: 'Student 2',
        class: '10',
        section: 'B',
        rollNumber: '2',
      });

      await Notification.create([
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'Absence Alert',
          message: 'You were absent',
          type: 'absence',
          channel: 'push',
        },
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'New Event',
          message: 'Holiday announced',
          type: 'calendar',
          channel: 'push',
        },
      ]);

      const res = await request(app)
        .get('/api/dashboard/student')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.recentNotifications).toHaveLength(2);
    });

    it('should return upcoming events for the student', async () => {
      const app = buildApp();
      const studentObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-S-2024-003',
        _id: studentObjId.toString(),
        role: 'student',
        schoolCode: SCHOOL_CODE,
        name: 'Student 3',
      };

      await Student.create({
        studentId: 'DPS-DEL-S-2024-003',
        schoolCode: SCHOOL_CODE,
        userId: studentObjId,
        name: 'Student 3',
        class: '10',
        section: 'C',
        rollNumber: '3',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await CalendarEvent.create({
        schoolCode: SCHOOL_CODE,
        title: 'Exam Week',
        eventType: 'Exam',
        startDate: futureDate,
        endDate: futureDate,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const res = await request(app)
        .get('/api/dashboard/student')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.upcomingEvents).toHaveLength(1);
      expect(res.body.data.upcomingEvents[0].title).toBe('Exam Week');
    });

    it('should return 0 attendance when no records exist for current month', async () => {
      const app = buildApp();
      const studentObjId = new mongoose.Types.ObjectId();

      const user = {
        userId: 'DPS-DEL-S-2024-004',
        _id: studentObjId.toString(),
        role: 'student',
        schoolCode: SCHOOL_CODE,
        name: 'Student 4',
      };

      await Student.create({
        studentId: 'DPS-DEL-S-2024-004',
        schoolCode: SCHOOL_CODE,
        userId: studentObjId,
        name: 'Student 4',
        class: '10',
        section: 'D',
        rollNumber: '4',
      });

      const res = await request(app)
        .get('/api/dashboard/student')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.attendance.present).toBe(0);
      expect(res.body.data.attendance.absent).toBe(0);
      expect(res.body.data.attendance.late).toBe(0);
      expect(res.body.data.attendance.total).toBe(0);
      expect(res.body.data.attendance.percentage).toBe(0);
    });
  });
});
