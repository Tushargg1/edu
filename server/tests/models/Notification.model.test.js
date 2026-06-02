import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../../models/Notification.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Notification.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Notification Model', () => {
  const validNotificationData = {
    schoolCode: 'DPS-RKP-001',
    userId: 'DPS-RKP-S-2024-047',
    title: 'Absence Alert',
    message: 'Your child was marked absent on 2024-10-31',
    type: 'absence',
    channel: 'push',
  };

  describe('Schema validation', () => {
    it('should create a notification with all valid fields', async () => {
      const notification = await Notification.create(validNotificationData);
      expect(notification.schoolCode).toBe('DPS-RKP-001');
      expect(notification.userId).toBe('DPS-RKP-S-2024-047');
      expect(notification.title).toBe('Absence Alert');
      expect(notification.message).toBe('Your child was marked absent on 2024-10-31');
      expect(notification.type).toBe('absence');
      expect(notification.channel).toBe('push');
      expect(notification.isRead).toBe(false);
      expect(notification.metadata).toBeNull();
      expect(notification.createdAt).toBeDefined();
      expect(notification.updatedAt).toBeDefined();
    });

    it('should create a notification with metadata', async () => {
      const metadata = { studentId: 'DPS-RKP-S-2024-047', date: '2024-10-31' };
      const notification = await Notification.create({
        ...validNotificationData,
        metadata,
      });
      expect(notification.metadata).toEqual(metadata);
    });

    it('should default isRead to false', async () => {
      const notification = await Notification.create(validNotificationData);
      expect(notification.isRead).toBe(false);
    });

    it('should allow setting isRead to true', async () => {
      const notification = await Notification.create({
        ...validNotificationData,
        isRead: true,
      });
      expect(notification.isRead).toBe(true);
    });

    it('should require schoolCode', async () => {
      const { schoolCode, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should require userId', async () => {
      const { userId, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should require title', async () => {
      const { title, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should require message', async () => {
      const { message, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should require type', async () => {
      const { type, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should require channel', async () => {
      const { channel, ...data } = validNotificationData;
      await expect(Notification.create(data)).rejects.toThrow();
    });

    it('should trim string fields', async () => {
      const notification = await Notification.create({
        ...validNotificationData,
        schoolCode: '  DPS-RKP-001  ',
        userId: '  DPS-RKP-S-2024-047  ',
        title: '  Absence Alert  ',
        message: '  Your child was absent  ',
      });
      expect(notification.schoolCode).toBe('DPS-RKP-001');
      expect(notification.userId).toBe('DPS-RKP-S-2024-047');
      expect(notification.title).toBe('Absence Alert');
      expect(notification.message).toBe('Your child was absent');
    });
  });

  describe('type enum', () => {
    it.each(['absence', 'calendar', 'credential', 'system'])(
      'should accept type "%s"',
      async (type) => {
        const notification = await Notification.create({
          ...validNotificationData,
          type,
        });
        expect(notification.type).toBe(type);
      }
    );

    it('should reject invalid type values', async () => {
      await expect(
        Notification.create({
          ...validNotificationData,
          type: 'alert',
        })
      ).rejects.toThrow();
    });
  });

  describe('channel enum', () => {
    it.each(['push', 'sms', 'email'])(
      'should accept channel "%s"',
      async (channel) => {
        const notification = await Notification.create({
          ...validNotificationData,
          channel,
        });
        expect(notification.channel).toBe(channel);
      }
    );

    it('should reject invalid channel values', async () => {
      await expect(
        Notification.create({
          ...validNotificationData,
          channel: 'whatsapp',
        })
      ).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have a compound index on schoolCode + userId + isRead', () => {
      const indexes = Notification.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) =>
          fields.schoolCode === 1 && fields.userId === 1 && fields.isRead === 1
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const notification = await Notification.create(validNotificationData);
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Metadata (Mixed type)', () => {
    it('should accept an object as metadata', async () => {
      const notification = await Notification.create({
        ...validNotificationData,
        metadata: { studentId: 'S-001', date: '2024-10-31' },
      });
      expect(notification.metadata.studentId).toBe('S-001');
    });

    it('should accept nested objects in metadata', async () => {
      const notification = await Notification.create({
        ...validNotificationData,
        metadata: { event: { title: 'Diwali', type: 'Holiday' } },
      });
      expect(notification.metadata.event.title).toBe('Diwali');
    });

    it('should default metadata to null', async () => {
      const notification = await Notification.create(validNotificationData);
      expect(notification.metadata).toBeNull();
    });
  });
});
