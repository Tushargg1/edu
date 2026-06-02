import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Attendance from '../../models/Attendance.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Attendance.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Attendance Model', () => {
  const teacherId = new mongoose.Types.ObjectId();

  const validAttendanceData = {
    schoolCode: 'DPS-RKP-001',
    class: '10',
    section: 'A',
    date: new Date('2024-06-15'),
    markedBy: teacherId,
    records: [
      { studentId: 'DPS-RKP-S-2024-001', status: 'present', notified: false },
      { studentId: 'DPS-RKP-S-2024-002', status: 'absent', notified: false },
      { studentId: 'DPS-RKP-S-2024-003', status: 'late', notified: false },
    ],
  };

  describe('Schema validation', () => {
    it('should create an attendance record with all valid fields', async () => {
      const attendance = await Attendance.create(validAttendanceData);
      expect(attendance.schoolCode).toBe('DPS-RKP-001');
      expect(attendance.class).toBe('10');
      expect(attendance.section).toBe('A');
      expect(attendance.date).toEqual(new Date('2024-06-15'));
      expect(attendance.markedBy.toString()).toBe(teacherId.toString());
      expect(attendance.records).toHaveLength(3);
      expect(attendance.createdAt).toBeDefined();
      expect(attendance.updatedAt).toBeDefined();
    });

    it('should require schoolCode', async () => {
      const { schoolCode, ...data } = validAttendanceData;
      await expect(Attendance.create(data)).rejects.toThrow();
    });

    it('should require class', async () => {
      const { class: _cls, ...data } = validAttendanceData;
      await expect(Attendance.create(data)).rejects.toThrow();
    });

    it('should require section', async () => {
      const { section, ...data } = validAttendanceData;
      await expect(Attendance.create(data)).rejects.toThrow();
    });

    it('should require date', async () => {
      const { date, ...data } = validAttendanceData;
      await expect(Attendance.create(data)).rejects.toThrow();
    });

    it('should require markedBy', async () => {
      const { markedBy, ...data } = validAttendanceData;
      await expect(Attendance.create(data)).rejects.toThrow();
    });

    it('should default records to an empty array', async () => {
      const { records, ...data } = validAttendanceData;
      const attendance = await Attendance.create(data);
      expect(attendance.records).toEqual([]);
    });

    it('should trim string fields', async () => {
      const attendance = await Attendance.create({
        ...validAttendanceData,
        schoolCode: '  DPS-RKP-001  ',
        class: '  10  ',
        section: '  A  ',
      });
      expect(attendance.schoolCode).toBe('DPS-RKP-001');
      expect(attendance.class).toBe('10');
      expect(attendance.section).toBe('A');
    });
  });

  describe('Records sub-schema', () => {
    it('should store records with correct status values', async () => {
      const attendance = await Attendance.create(validAttendanceData);
      expect(attendance.records[0].status).toBe('present');
      expect(attendance.records[1].status).toBe('absent');
      expect(attendance.records[2].status).toBe('late');
    });

    it('should default notified to false', async () => {
      const attendance = await Attendance.create({
        ...validAttendanceData,
        records: [{ studentId: 'DPS-RKP-S-2024-001', status: 'present' }],
      });
      expect(attendance.records[0].notified).toBe(false);
    });

    it('should reject invalid status enum values', async () => {
      await expect(
        Attendance.create({
          ...validAttendanceData,
          records: [{ studentId: 'DPS-RKP-S-2024-001', status: 'excused' }],
        })
      ).rejects.toThrow();
    });

    it('should require studentId in records', async () => {
      await expect(
        Attendance.create({
          ...validAttendanceData,
          records: [{ status: 'present' }],
        })
      ).rejects.toThrow();
    });

    it('should require status in records', async () => {
      await expect(
        Attendance.create({
          ...validAttendanceData,
          records: [{ studentId: 'DPS-RKP-S-2024-001' }],
        })
      ).rejects.toThrow();
    });

    it('should not generate _id for sub-documents', async () => {
      const attendance = await Attendance.create(validAttendanceData);
      attendance.records.forEach((record) => {
        expect(record._id).toBeUndefined();
      });
    });

    it('should trim studentId in records', async () => {
      const attendance = await Attendance.create({
        ...validAttendanceData,
        records: [
          { studentId: '  DPS-RKP-S-2024-001  ', status: 'present' },
        ],
      });
      expect(attendance.records[0].studentId).toBe('DPS-RKP-S-2024-001');
    });
  });

  describe('Indexes', () => {
    it('should have a compound unique index on schoolCode + class + section + date', () => {
      const indexes = Attendance.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, opts]) =>
          fields.schoolCode === 1 &&
          fields.class === 1 &&
          fields.section === 1 &&
          fields.date === 1 &&
          opts.unique === true
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should enforce unique schoolCode + class + section + date combination', async () => {
      await Attendance.create(validAttendanceData);
      await expect(
        Attendance.create({
          ...validAttendanceData,
          markedBy: new mongoose.Types.ObjectId(),
          records: [{ studentId: 'DPS-RKP-S-2024-010', status: 'present' }],
        })
      ).rejects.toThrow();
    });

    it('should allow same class-section on different dates', async () => {
      await Attendance.create(validAttendanceData);
      const attendance2 = await Attendance.create({
        ...validAttendanceData,
        date: new Date('2024-06-16'),
      });
      expect(attendance2.date).toEqual(new Date('2024-06-16'));
    });

    it('should allow same date for different sections', async () => {
      await Attendance.create(validAttendanceData);
      const attendance2 = await Attendance.create({
        ...validAttendanceData,
        section: 'B',
      });
      expect(attendance2.section).toBe('B');
    });

    it('should allow same date for different classes', async () => {
      await Attendance.create(validAttendanceData);
      const attendance2 = await Attendance.create({
        ...validAttendanceData,
        class: '11',
      });
      expect(attendance2.class).toBe('11');
    });

    it('should allow same date and class-section for different schools', async () => {
      await Attendance.create(validAttendanceData);
      const attendance2 = await Attendance.create({
        ...validAttendanceData,
        schoolCode: 'KV-DEL-001',
      });
      expect(attendance2.schoolCode).toBe('KV-DEL-001');
    });
  });
});
