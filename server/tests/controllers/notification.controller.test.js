import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

const TEST_JWT_SECRET = 'test-jwt-secret-key';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';

let mongoServer;
let Notification;
let notificationController;

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.NODE_ENV = 'test';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  notificationController = await import('../../controllers/notification.controller.js');
  Notification = mongoose.model('Notification');
});

afterEach(async () => {
  await Notification.deleteMany({});
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

  app.get(
    '/api/notifications',
    injectTestUser,
    injectSchoolFilter,
    notificationController.listNotifications
  );

  app.patch(
    '/api/notifications/:id/read',
    injectTestUser,
    injectSchoolFilter,
    notificationController.markAsRead
  );

  return app;
}

const SCHOOL_CODE = 'DPS-DEL-001';

function studentUser(overrides = {}) {
  return {
    userId: 'DPS-DEL-S-2024-001',
    _id: overrides._id || new mongoose.Types.ObjectId().toString(),
    role: 'student',
    schoolCode: SCHOOL_CODE,
    name: 'Student User',
    ...overrides,
  };
}

function teacherUser(overrides = {}) {
  return {
    userId: 'DPS-DEL-T-001',
    _id: overrides._id || new mongoose.Types.ObjectId().toString(),
    role: 'teacher',
    schoolCode: SCHOOL_CODE,
    name: 'Teacher User',
    ...overrides,
  };
}

describe('Notification Controller', () => {
  describe('GET /api/notifications (listNotifications)', () => {
    it('should return notifications for the current user sorted by createdAt desc', async () => {
      const app = buildApp();
      const user = studentUser();

      await Notification.create([
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'Older Notification',
          message: 'Older message',
          type: 'absence',
          channel: 'push',
          createdAt: new Date('2025-01-01'),
        },
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'Newer Notification',
          message: 'Newer message',
          type: 'calendar',
          channel: 'push',
          createdAt: new Date('2025-02-01'),
        },
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(2);
      expect(res.body.data.notifications[0].title).toBe('Newer Notification');
      expect(res.body.data.notifications[1].title).toBe('Older Notification');
    });

    it('should only return notifications for the current user', async () => {
      const app = buildApp();
      const user = studentUser();

      await Notification.create([
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'My Notification',
          message: 'My message',
          type: 'absence',
          channel: 'push',
        },
        {
          schoolCode: SCHOOL_CODE,
          userId: 'DPS-DEL-S-2024-999',
          title: 'Other User Notification',
          message: 'Other message',
          type: 'absence',
          channel: 'push',
        },
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].title).toBe('My Notification');
    });

    it('should only return notifications scoped to the user school', async () => {
      const app = buildApp();
      const user = studentUser();

      await Notification.create([
        {
          schoolCode: SCHOOL_CODE,
          userId: user.userId,
          title: 'My School Notification',
          message: 'Message',
          type: 'system',
          channel: 'push',
        },
        {
          schoolCode: 'OTH-MUM-001',
          userId: user.userId,
          title: 'Other School Notification',
          message: 'Message',
          type: 'system',
          channel: 'push',
        },
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].title).toBe('My School Notification');
    });

    it('should return empty array when no notifications exist', async () => {
      const app = buildApp();
      const user = studentUser();

      const res = await request(app)
        .get('/api/notifications')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(0);
    });

    it('should work for teacher role', async () => {
      const app = buildApp();
      const user = teacherUser();

      await Notification.create({
        schoolCode: SCHOOL_CODE,
        userId: user.userId,
        title: 'Teacher Notification',
        message: 'Message',
        type: 'calendar',
        channel: 'push',
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
    });
  });

  describe('PATCH /api/notifications/:id/read (markAsRead)', () => {
    it('should mark a notification as read', async () => {
      const app = buildApp();
      const user = studentUser();

      const notification = await Notification.create({
        schoolCode: SCHOOL_CODE,
        userId: user.userId,
        title: 'Unread Notification',
        message: 'Message',
        type: 'absence',
        channel: 'push',
        isRead: false,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);

      // Verify in DB
      const dbNotification = await Notification.findById(notification._id);
      expect(dbNotification.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const app = buildApp();
      const user = studentUser();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/notifications/${fakeId}/read`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when notification belongs to different school', async () => {
      const app = buildApp();
      const user = studentUser();

      const notification = await Notification.create({
        schoolCode: 'OTH-MUM-001',
        userId: user.userId,
        title: 'Other School',
        message: 'Message',
        type: 'system',
        channel: 'push',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
    });

    it('should return 404 when notification belongs to different user', async () => {
      const app = buildApp();
      const user = studentUser();

      const notification = await Notification.create({
        schoolCode: SCHOOL_CODE,
        userId: 'DPS-DEL-S-2024-999',
        title: 'Other User',
        message: 'Message',
        type: 'system',
        channel: 'push',
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(404);
    });

    it('should be idempotent — marking already-read notification as read', async () => {
      const app = buildApp();
      const user = studentUser();

      const notification = await Notification.create({
        schoolCode: SCHOOL_CODE,
        userId: user.userId,
        title: 'Already Read',
        message: 'Message',
        type: 'absence',
        channel: 'push',
        isRead: true,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notification._id}/read`)
        .set('x-test-user', JSON.stringify(user));

      expect(res.status).toBe(200);
      expect(res.body.data.notification.isRead).toBe(true);
    });
  });
});
