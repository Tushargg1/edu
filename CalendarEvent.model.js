import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createNotificationService } from '../../services/notification.service.js';

// Models are registered by the service's require() calls.
// Access them via mongoose.model() to avoid double-registration.
let User;
let Notification;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  User = mongoose.model('User');
  Notification = mongoose.model('Notification');
});

afterEach(async () => {
  await User.deleteMany({});
  await Notification.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Helper: create a User record in the database.
 */
async function createUser(overrides = {}) {
  const defaults = {
    userId: 'DPS-RKP-S-2024-001',
    schoolCode: 'DPS-RKP-001',
    role: 'student',
    password: 'tempPass123',
    name: 'Test Student',
    email: 'student@test.com',
    phone: '+919876543210',
    isActive: true,
    fcmToken: null,
  };
  return User.create({ ...defaults, ...overrides });
}

/**
 * Helper: build a mock student object that mirrors the Student model shape.
 */
function buildStudent(userId, overrides = {}) {
  return {
    studentId: 'DPS-RKP-S-2024-001',
    schoolCode: 'DPS-RKP-001',
    userId,
    name: 'Rahul Sharma',
    class: '10',
    section: 'A',
    parentPhone: '+919876543210',
    ...overrides,
  };
}

describe('Notification Service', () => {
  describe('sendAbsenceNotification', () => {
    it('should send push notification when user has fcmToken', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const sendSMS = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        sendSMS,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: 'fcm-token-123' });
      const student = buildStudent(user._id);
      const date = new Date('2024-06-15');

      const result = await service.sendAbsenceNotification(student, date);

      expect(result).toEqual({ channel: 'push', success: true });
      expect(sendPush).toHaveBeenCalledOnce();
      expect(sendPush).toHaveBeenCalledWith(
        'fcm-token-123',
        'Absence Alert',
        expect.stringContaining('Rahul Sharma')
      );
      expect(sendSMS).not.toHaveBeenCalled();

      // Verify Notification record was created
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('absence');
      expect(notifications[0].channel).toBe('push');
      expect(notifications[0].metadata.studentName).toBe('Rahul Sharma');
    });

    it('should fall back to SMS when user has no fcmToken', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const sendSMS = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        sendSMS,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: null, phone: '+919876543210' });
      const student = buildStudent(user._id);
      const date = new Date('2024-06-15');

      const result = await service.sendAbsenceNotification(student, date);

      expect(result).toEqual({ channel: 'sms', success: true });
      expect(sendSMS).toHaveBeenCalledOnce();
      expect(sendSMS).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringContaining('Rahul Sharma')
      );
      expect(sendPush).not.toHaveBeenCalled();

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0].channel).toBe('sms');
    });

    it('should include student name, class, section, and date in the message', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: 'token-abc' });
      const student = buildStudent(user._id, {
        name: 'Priya Patel',
        class: '8',
        section: 'B',
      });
      const date = new Date('2024-03-20');

      await service.sendAbsenceNotification(student, date);

      const msgArg = sendPush.mock.calls[0][2];
      expect(msgArg).toContain('Priya Patel');
      expect(msgArg).toContain('Class 8');
      expect(msgArg).toContain('Section B');
      expect(msgArg).toContain('2024-03-20');
    });

    it('should create a Notification record with correct metadata', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: 'token-xyz' });
      const student = buildStudent(user._id);
      const date = new Date('2024-06-15');

      await service.sendAbsenceNotification(student, date);

      const notif = await Notification.findOne({});
      expect(notif.schoolCode).toBe('DPS-RKP-001');
      expect(notif.userId).toBe(user.userId);
      expect(notif.type).toBe('absence');
      expect(notif.metadata.studentId).toBe('DPS-RKP-S-2024-001');
      expect(notif.metadata.date).toBe('2024-06-15');
    });

    it('should return success: false when push fails after retries', async () => {
      const sendPush = vi.fn().mockRejectedValue(new Error('FCM unavailable'));
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: 'token-fail' });
      const student = buildStudent(user._id);
      const date = new Date('2024-06-15');

      const result = await service.sendAbsenceNotification(student, date);

      expect(result).toEqual({ channel: 'push', success: false });
      // 1 initial + 3 retries = 4 calls
      expect(sendPush).toHaveBeenCalledTimes(4);
    });

    it('should return success: false for SMS when no phone number available', async () => {
      const sendSMS = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendSMS,
        delay: () => Promise.resolve(),
      });

      const user = await createUser({ fcmToken: null, phone: null });
      const student = buildStudent(user._id, { parentPhone: null });

      const result = await service.sendAbsenceNotification(student, new Date());

      expect(result).toEqual({ channel: 'sms', success: false });
      expect(sendSMS).not.toHaveBeenCalled();
    });

    it('should throw when user is not found', async () => {
      const service = createNotificationService({
        delay: () => Promise.resolve(),
      });

      const fakeObjectId = new mongoose.Types.ObjectId();
      const student = buildStudent(fakeObjectId);

      await expect(
        service.sendAbsenceNotification(student, new Date())
      ).rejects.toThrow('User not found');
    });
  });

  describe('sendCalendarEventNotification', () => {
    it('should send push to all school users with FCM tokens', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        fcmToken: 'teacher-token',
      });
      await createUser({
        userId: 'DPS-RKP-T-002',
        role: 'teacher',
        fcmToken: 'teacher-token-2',
      });
      await createUser({
        userId: 'DPS-RKP-S-2024-001',
        role: 'student',
        fcmToken: null,
      });

      const event = {
        title: 'Annual Day',
        eventType: 'School_Event',
        startDate: new Date('2024-12-20'),
      };

      await service.sendCalendarEventNotification(event, 'DPS-RKP-001');

      // Push sent only to users with fcmToken
      expect(sendPush).toHaveBeenCalledTimes(2);

      // Notification records created for all 3 users
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(3);
      notifications.forEach((n) => {
        expect(n.type).toBe('calendar');
        expect(n.schoolCode).toBe('DPS-RKP-001');
        expect(n.metadata.eventTitle).toBe('Annual Day');
        expect(n.metadata.eventType).toBe('School_Event');
      });
    });

    it('should include event title, type, and start date in the message', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        fcmToken: 'token-1',
      });

      const event = {
        title: 'Mid-Term Exams',
        eventType: 'Exam',
        startDate: new Date('2024-09-15'),
      };

      await service.sendCalendarEventNotification(event, 'DPS-RKP-001');

      const msgArg = sendPush.mock.calls[0][2];
      expect(msgArg).toContain('Mid-Term Exams');
      expect(msgArg).toContain('Exam');
      expect(msgArg).toContain('2024-09-15');
    });

    it('should not send push to inactive users', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        fcmToken: 'active-token',
        isActive: true,
      });
      await createUser({
        userId: 'DPS-RKP-T-002',
        role: 'teacher',
        fcmToken: 'inactive-token',
        isActive: false,
      });

      const event = {
        title: 'Holiday',
        eventType: 'Holiday',
        startDate: new Date('2024-08-15'),
      };

      await service.sendCalendarEventNotification(event, 'DPS-RKP-001');

      expect(sendPush).toHaveBeenCalledTimes(1);
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
    });

    it('should handle empty school (no users)', async () => {
      const sendPush = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendPush,
        delay: () => Promise.resolve(),
      });

      const event = {
        title: 'PTM',
        eventType: 'PTM',
        startDate: new Date('2024-07-01'),
      };

      await service.sendCalendarEventNotification(event, 'EMPTY-SCH-001');

      expect(sendPush).not.toHaveBeenCalled();
      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(0);
    });
  });

  describe('sendCredentialNotification', () => {
    it('should send credentials via email when channel includes email', async () => {
      const sendEmail = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendEmail,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        email: 'teacher@school.com',
      });

      await service.sendCredentialNotification(
        'DPS-RKP-T-001',
        { id: 'DPS-RKP-T-001', password: 'temp123' },
        ['email']
      );

      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail).toHaveBeenCalledWith(
        'teacher@school.com',
        'Your EduSync Credentials',
        expect.stringContaining('DPS-RKP-T-001')
      );

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('credential');
      expect(notifications[0].channel).toBe('email');
    });

    it('should send credentials via SMS when channel includes sms', async () => {
      const sendSMS = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendSMS,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        phone: '+919876543210',
      });

      await service.sendCredentialNotification(
        'DPS-RKP-T-001',
        { id: 'DPS-RKP-T-001', password: 'temp123' },
        ['sms']
      );

      expect(sendSMS).toHaveBeenCalledOnce();

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(1);
      expect(notifications[0].channel).toBe('sms');
    });

    it('should send via both email and SMS when both channels specified', async () => {
      const sendEmail = vi.fn().mockResolvedValue({ success: true });
      const sendSMS = vi.fn().mockResolvedValue({ success: true });
      const service = createNotificationService({
        sendEmail,
        sendSMS,
        delay: () => Promise.resolve(),
      });

      await createUser({
        userId: 'DPS-RKP-T-001',
        role: 'teacher',
        email: 'teacher@school.com',
        phone: '+919876543210',
      });

      await service.sendCredentialNotification(
        'DPS-RKP-T-001',
        { id: 'DPS-RKP-T-001', password: 'temp123' },
        ['email', 'sms']
      );

      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendSMS).toHaveBeenCalledOnce();

      const notifications = await Notification.find({});
      expect(notifications).toHaveLength(2);
    });

    it('should throw when user is not found', async () => {
      const service = createNotificationService({
        delay: () => Promise.resolve(),
      });

      await expect(
        service.sendCredentialNotification(
          'NONEXISTENT-001',
          { id: 'NONEXISTENT-001', password: 'temp' },
          ['email']
        )
      ).rejects.toThrow('User not found');
    });
  });

  describe('withRetry (exponential backoff)', () => {
    it('should succeed on first attempt without retries', async () => {
      const delay = vi.fn().mockResolvedValue(undefined);
      const service = createNotificationService({ delay });

      const fn = vi.fn().mockResolvedValue('ok');
      const result = await service.withRetry(fn);

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(delay).not.toHaveBeenCalled();
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const delay = vi.fn().mockResolvedValue(undefined);
      const service = createNotificationService({ delay });

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      const result = await service.withRetry(fn);

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(delay).toHaveBeenCalledTimes(1);
      // First retry delay: 500 * 2^0 = 500ms
      expect(delay).toHaveBeenCalledWith(500);
    });

    it('should use exponential backoff delays', async () => {
      const delay = vi.fn().mockResolvedValue(undefined);
      const service = createNotificationService({ delay });

      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockResolvedValue('ok');

      const result = await service.withRetry(fn);

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(4);
      expect(delay).toHaveBeenCalledTimes(3);
      // Delays: 500*2^0=500, 500*2^1=1000, 500*2^2=2000
      expect(delay).toHaveBeenNthCalledWith(1, 500);
      expect(delay).toHaveBeenNthCalledWith(2, 1000);
      expect(delay).toHaveBeenNthCalledWith(3, 2000);
    });

    it('should throw after max retries exhausted', async () => {
      const delay = vi.fn().mockResolvedValue(undefined);
      const service = createNotificationService({ delay });

      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(service.withRetry(fn)).rejects.toThrow('persistent failure');
      // 1 initial + 3 retries = 4 calls
      expect(fn).toHaveBeenCalledTimes(4);
      expect(delay).toHaveBeenCalledTimes(3);
    });
  });
});
