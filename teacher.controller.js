import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import IDCounter from '../../models/IDCounter.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await IDCounter.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('IDCounter Model', () => {
  const validCounterData = {
    schoolCode: 'DPS-RKP-001',
    type: 'teacher',
    year: null,
    sequence: 0,
  };

  describe('Schema validation', () => {
    it('should create a counter with all valid fields', async () => {
      const counter = await IDCounter.create(validCounterData);
      expect(counter.schoolCode).toBe('DPS-RKP-001');
      expect(counter.type).toBe('teacher');
      expect(counter.year).toBeNull();
      expect(counter.sequence).toBe(0);
      expect(counter.createdAt).toBeDefined();
      expect(counter.updatedAt).toBeDefined();
    });

    it('should require type field', async () => {
      const { type, ...data } = validCounterData;
      await expect(IDCounter.create(data)).rejects.toThrow();
    });

    it('should reject invalid type values', async () => {
      await expect(
        IDCounter.create({ ...validCounterData, type: 'admin' })
      ).rejects.toThrow();
    });

    it('should accept all valid type enum values', async () => {
      const types = ['school', 'teacher', 'student'];
      for (const type of types) {
        const counter = await IDCounter.create({
          ...validCounterData,
          schoolCode: `SC-${type}`,
          type,
        });
        expect(counter.type).toBe(type);
      }
    });

    it('should default sequence to 0', async () => {
      const counter = await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'teacher',
      });
      expect(counter.sequence).toBe(0);
    });

    it('should default schoolCode to null', async () => {
      const counter = await IDCounter.create({
        type: 'school',
      });
      expect(counter.schoolCode).toBeNull();
    });

    it('should default year to null', async () => {
      const counter = await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'teacher',
      });
      expect(counter.year).toBeNull();
    });

    it('should allow year for student type counters', async () => {
      const counter = await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'student',
        year: 2024,
      });
      expect(counter.year).toBe(2024);
    });

    it('should allow null schoolCode for school-level counters', async () => {
      const counter = await IDCounter.create({
        schoolCode: null,
        type: 'school',
        year: null,
      });
      expect(counter.schoolCode).toBeNull();
      expect(counter.type).toBe('school');
    });
  });

  describe('Compound unique index', () => {
    it('should have a compound unique index on schoolCode + type + year', () => {
      const indexes = IDCounter.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, opts]) =>
          fields.schoolCode === 1 &&
          fields.type === 1 &&
          fields.year === 1 &&
          opts.unique === true
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should enforce uniqueness on schoolCode + type + year', async () => {
      await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'teacher',
        year: null,
      });
      await expect(
        IDCounter.create({
          schoolCode: 'DPS-RKP-001',
          type: 'teacher',
          year: null,
        })
      ).rejects.toThrow();
    });

    it('should allow same type with different schoolCodes', async () => {
      await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'teacher',
        year: null,
      });
      const counter = await IDCounter.create({
        schoolCode: 'DPS-DEL-002',
        type: 'teacher',
        year: null,
      });
      expect(counter.schoolCode).toBe('DPS-DEL-002');
    });

    it('should allow same schoolCode and type with different years', async () => {
      await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'student',
        year: 2023,
      });
      const counter = await IDCounter.create({
        schoolCode: 'DPS-RKP-001',
        type: 'student',
        year: 2024,
      });
      expect(counter.year).toBe(2024);
    });
  });

  describe('Atomic sequence generation via findOneAndUpdate', () => {
    it('should atomically increment sequence with upsert', async () => {
      const result = await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'teacher', year: null },
        { $inc: { sequence: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      expect(result.sequence).toBe(1);
    });

    it('should increment sequence on successive calls', async () => {
      const filter = { schoolCode: 'DPS-RKP-001', type: 'teacher', year: null };
      const opts = { returnDocument: 'after', upsert: true };

      const first = await IDCounter.findOneAndUpdate(filter, { $inc: { sequence: 1 } }, opts);
      const second = await IDCounter.findOneAndUpdate(filter, { $inc: { sequence: 1 } }, opts);
      const third = await IDCounter.findOneAndUpdate(filter, { $inc: { sequence: 1 } }, opts);

      expect(first.sequence).toBe(1);
      expect(second.sequence).toBe(2);
      expect(third.sequence).toBe(3);
    });

    it('should maintain separate sequences for different types', async () => {
      const opts = { returnDocument: 'after', upsert: true };

      await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'teacher', year: null },
        { $inc: { sequence: 1 } },
        opts
      );
      await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'teacher', year: null },
        { $inc: { sequence: 1 } },
        opts
      );

      const studentCounter = await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'student', year: 2024 },
        { $inc: { sequence: 1 } },
        opts
      );

      const teacherCounter = await IDCounter.findOne({
        schoolCode: 'DPS-RKP-001',
        type: 'teacher',
      });

      expect(teacherCounter.sequence).toBe(2);
      expect(studentCounter.sequence).toBe(1);
    });

    it('should maintain separate sequences for different years', async () => {
      const opts = { returnDocument: 'after', upsert: true };

      const counter2023 = await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'student', year: 2023 },
        { $inc: { sequence: 1 } },
        opts
      );
      const counter2024 = await IDCounter.findOneAndUpdate(
        { schoolCode: 'DPS-RKP-001', type: 'student', year: 2024 },
        { $inc: { sequence: 1 } },
        opts
      );

      expect(counter2023.sequence).toBe(1);
      expect(counter2024.sequence).toBe(1);
    });

    it('should support school code generation with null schoolCode', async () => {
      const opts = { returnDocument: 'after', upsert: true };

      const result = await IDCounter.findOneAndUpdate(
        { schoolCode: null, type: 'school', year: null },
        { $inc: { sequence: 1 } },
        opts
      );

      expect(result.sequence).toBe(1);
      expect(result.schoolCode).toBeNull();
      expect(result.type).toBe('school');
    });
  });
});
