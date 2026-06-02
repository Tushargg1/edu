import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Teacher from '../../models/Teacher.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Teacher.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Teacher Model', () => {
  const userId = new mongoose.Types.ObjectId();

  const validTeacherData = {
    teacherId: 'DPS-RKP-T-001',
    schoolCode: 'DPS-RKP-001',
    userId,
    name: 'Priya Sharma',
    email: 'priya@dps.edu',
    phone: '9876543210',
    subjects: ['Mathematics', 'Physics'],
    assignedClasses: [
      { class: '10', section: 'A' },
      { class: '10', section: 'B' },
    ],
    isClassTeacher: true,
    classTeacherOf: { class: '10', section: 'A' },
  };

  describe('Schema validation', () => {
    it('should create a teacher with all valid fields', async () => {
      const teacher = await Teacher.create(validTeacherData);
      expect(teacher.teacherId).toBe('DPS-RKP-T-001');
      expect(teacher.schoolCode).toBe('DPS-RKP-001');
      expect(teacher.userId.toString()).toBe(userId.toString());
      expect(teacher.name).toBe('Priya Sharma');
      expect(teacher.email).toBe('priya@dps.edu');
      expect(teacher.phone).toBe('9876543210');
      expect(teacher.subjects).toEqual(['Mathematics', 'Physics']);
      expect(teacher.assignedClasses).toHaveLength(2);
      expect(teacher.assignedClasses[0].class).toBe('10');
      expect(teacher.assignedClasses[0].section).toBe('A');
      expect(teacher.assignedClasses[1].class).toBe('10');
      expect(teacher.assignedClasses[1].section).toBe('B');
      expect(teacher.isClassTeacher).toBe(true);
      expect(teacher.classTeacherOf.class).toBe('10');
      expect(teacher.classTeacherOf.section).toBe('A');
      expect(teacher.isActive).toBe(true);
      expect(teacher.createdAt).toBeDefined();
      expect(teacher.updatedAt).toBeDefined();
    });

    it('should require teacherId', async () => {
      const { teacherId, ...data } = validTeacherData;
      await expect(Teacher.create(data)).rejects.toThrow();
    });

    it('should require schoolCode', async () => {
      const { schoolCode, ...data } = validTeacherData;
      await expect(Teacher.create(data)).rejects.toThrow();
    });

    it('should require userId', async () => {
      const { userId: _uid, ...data } = validTeacherData;
      await expect(Teacher.create(data)).rejects.toThrow();
    });

    it('should require name', async () => {
      const { name, ...data } = validTeacherData;
      await expect(Teacher.create(data)).rejects.toThrow();
    });

    it('should require email', async () => {
      const { email, ...data } = validTeacherData;
      await expect(Teacher.create(data)).rejects.toThrow();
    });

    it('should default isActive to true', async () => {
      const teacher = await Teacher.create(validTeacherData);
      expect(teacher.isActive).toBe(true);
    });

    it('should default isClassTeacher to false', async () => {
      const { isClassTeacher, classTeacherOf, ...data } = validTeacherData;
      const teacher = await Teacher.create(data);
      expect(teacher.isClassTeacher).toBe(false);
    });

    it('should default subjects to empty array', async () => {
      const { subjects, ...data } = validTeacherData;
      const teacher = await Teacher.create(data);
      expect(teacher.subjects).toEqual([]);
    });

    it('should default assignedClasses to empty array', async () => {
      const { assignedClasses, ...data } = validTeacherData;
      const teacher = await Teacher.create(data);
      expect(teacher.assignedClasses).toEqual([]);
    });

    it('should lowercase email', async () => {
      const teacher = await Teacher.create({
        ...validTeacherData,
        email: 'Priya@DPS.EDU',
      });
      expect(teacher.email).toBe('priya@dps.edu');
    });

    it('should trim string fields', async () => {
      const teacher = await Teacher.create({
        ...validTeacherData,
        teacherId: '  DPS-RKP-T-002  ',
        schoolCode: '  DPS-RKP-001  ',
        name: '  Priya Sharma  ',
        email: '  priya2@dps.edu  ',
        phone: '  9876543210  ',
      });
      expect(teacher.teacherId).toBe('DPS-RKP-T-002');
      expect(teacher.schoolCode).toBe('DPS-RKP-001');
      expect(teacher.name).toBe('Priya Sharma');
      expect(teacher.email).toBe('priya2@dps.edu');
      expect(teacher.phone).toBe('9876543210');
    });

    it('should allow phone to be optional', async () => {
      const { phone, ...data } = validTeacherData;
      const teacher = await Teacher.create({
        ...data,
        teacherId: 'DPS-RKP-T-003',
      });
      expect(teacher.phone).toBeUndefined();
    });
  });

  describe('Indexes', () => {
    it('should have a unique index on teacherId', () => {
      const indexes = Teacher.schema.indexes();
      const teacherIdIndex = indexes.find(
        ([fields, opts]) => fields.teacherId === 1 && opts.unique === true
      );
      expect(teacherIdIndex).toBeDefined();
    });

    it('should have an index on schoolCode', () => {
      const indexes = Teacher.schema.indexes();
      const schoolCodeIndex = indexes.find(
        ([fields]) =>
          fields.schoolCode === 1 && !fields.email
      );
      expect(schoolCodeIndex).toBeDefined();
    });

    it('should have a compound unique index on schoolCode + email', () => {
      const indexes = Teacher.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, opts]) =>
          fields.schoolCode === 1 &&
          fields.email === 1 &&
          opts.unique === true
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should enforce unique teacherId', async () => {
      await Teacher.create(validTeacherData);
      await expect(
        Teacher.create({
          ...validTeacherData,
          email: 'other@dps.edu',
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should enforce unique schoolCode + email combination', async () => {
      await Teacher.create(validTeacherData);
      await expect(
        Teacher.create({
          ...validTeacherData,
          teacherId: 'DPS-RKP-T-002',
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should allow same email in different schools', async () => {
      await Teacher.create(validTeacherData);
      const teacher2 = await Teacher.create({
        ...validTeacherData,
        teacherId: 'KV-DEL-T-001',
        schoolCode: 'KV-DEL-001',
        userId: new mongoose.Types.ObjectId(),
      });
      expect(teacher2.email).toBe('priya@dps.edu');
      expect(teacher2.schoolCode).toBe('KV-DEL-001');
    });
  });
});
