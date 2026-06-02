import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CalendarEvent from '../../models/CalendarEvent.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await CalendarEvent.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('CalendarEvent Model', () => {
  const adminId = new mongoose.Types.ObjectId();

  const validEventData = {
    schoolCode: 'DPS-RKP-001',
    title: 'Diwali Holiday',
    eventType: 'Holiday',
    startDate: new Date('2024-10-31'),
    endDate: new Date('2024-11-05'),
    description: 'Diwali vacation for all students and staff',
    createdBy: adminId,
  };

  describe('Schema validation', () => {
    it('should create a calendar event with all valid fields', async () => {
      const event = await CalendarEvent.create(validEventData);
      expect(event.schoolCode).toBe('DPS-RKP-001');
      expect(event.title).toBe('Diwali Holiday');
      expect(event.eventType).toBe('Holiday');
      expect(event.startDate).toEqual(new Date('2024-10-31'));
      expect(event.endDate).toEqual(new Date('2024-11-05'));
      expect(event.description).toBe('Diwali vacation for all students and staff');
      expect(event.createdBy.toString()).toBe(adminId.toString());
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('should create an event without description (optional)', async () => {
      const { description, ...data } = validEventData;
      const event = await CalendarEvent.create(data);
      expect(event.description).toBeNull();
    });

    it('should require schoolCode', async () => {
      const { schoolCode, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should require title', async () => {
      const { title, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should require eventType', async () => {
      const { eventType, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should require startDate', async () => {
      const { startDate, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should require endDate', async () => {
      const { endDate, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should require createdBy', async () => {
      const { createdBy, ...data } = validEventData;
      await expect(CalendarEvent.create(data)).rejects.toThrow();
    });

    it('should trim string fields', async () => {
      const event = await CalendarEvent.create({
        ...validEventData,
        schoolCode: '  DPS-RKP-001  ',
        title: '  Diwali Holiday  ',
        description: '  Some description  ',
      });
      expect(event.schoolCode).toBe('DPS-RKP-001');
      expect(event.title).toBe('Diwali Holiday');
      expect(event.description).toBe('Some description');
    });
  });

  describe('eventType enum', () => {
    it.each(['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'])(
      'should accept eventType "%s"',
      async (type) => {
        const event = await CalendarEvent.create({
          ...validEventData,
          eventType: type,
        });
        expect(event.eventType).toBe(type);
      }
    );

    it('should reject invalid eventType values', async () => {
      await expect(
        CalendarEvent.create({
          ...validEventData,
          eventType: 'Party',
        })
      ).rejects.toThrow();
    });

    it('should reject lowercase eventType values', async () => {
      await expect(
        CalendarEvent.create({
          ...validEventData,
          eventType: 'holiday',
        })
      ).rejects.toThrow();
    });
  });

  describe('Date validation (pre-validate hook)', () => {
    it('should allow startDate equal to endDate (same-day event)', async () => {
      const event = await CalendarEvent.create({
        ...validEventData,
        startDate: new Date('2024-10-31'),
        endDate: new Date('2024-10-31'),
      });
      expect(event.startDate).toEqual(event.endDate);
    });

    it('should allow startDate before endDate', async () => {
      const event = await CalendarEvent.create({
        ...validEventData,
        startDate: new Date('2024-10-31'),
        endDate: new Date('2024-11-05'),
      });
      expect(event.startDate < event.endDate).toBe(true);
    });

    it('should reject startDate after endDate', async () => {
      await expect(
        CalendarEvent.create({
          ...validEventData,
          startDate: new Date('2024-11-05'),
          endDate: new Date('2024-10-31'),
        })
      ).rejects.toThrow('End date must be on or after start date');
    });
  });

  describe('Indexes', () => {
    it('should have a compound index on schoolCode + startDate', () => {
      const indexes = CalendarEvent.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) =>
          fields.schoolCode === 1 && fields.startDate === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should allow multiple events for the same school', async () => {
      await CalendarEvent.create(validEventData);
      const event2 = await CalendarEvent.create({
        ...validEventData,
        title: 'Mid-Term Exams',
        eventType: 'Exam',
        startDate: new Date('2024-09-15'),
        endDate: new Date('2024-09-25'),
      });
      expect(event2.title).toBe('Mid-Term Exams');
    });

    it('should allow events with the same title for different schools', async () => {
      await CalendarEvent.create(validEventData);
      const event2 = await CalendarEvent.create({
        ...validEventData,
        schoolCode: 'KV-DEL-001',
      });
      expect(event2.schoolCode).toBe('KV-DEL-001');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const event = await CalendarEvent.create(validEventData);
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });
  });
});
