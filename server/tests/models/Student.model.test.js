import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Student from '../../models/Student.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Student.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Student Model', () => {
  const userId = new mongoose.Types.ObjectId();

  const validStudentData = {
    studentId: 'DPS-RKP-S-2024-001',
    schoolCode: 'DPS-RKP-001',
    userId,
    name: 'Rahul Kumar',
    class: '10',
    section: 'A',
    rollNumber: '15',
    dob: new Date('2009-05-15'),
    gender: 'male',
    parentName: 'Suresh Kumar',
    parentPhone: '9876543210',
    parentEmail: 'suresh@example.com',
    admissionYear: 2024,
  };

  describe('Schema validation', () => {
    it('should create a student with all valid fields', async () => {
      const student = await Student.create(validStudentData);
      expect(student.studentId).toBe('DPS-RKP-S-2024-001');
      expect(student.schoolCode).toBe('DPS-RKP-001');
      expect(student.userId.toString()).toBe(userId.toString());
      expect(student.name).toBe('Rahul Kumar');
      expect(student.class).toBe('10');
      expect(student.section).toBe('A');
      expect(student.rollNumber).toBe('15');
      expect(student.dob).toEqual(new Date('2009-05-15'));
      expect(student.gender).toBe('male');
      expect(student.parentName).toBe('Suresh Kumar');
      expect(student.parentPhone).toBe('9876543210');
      expect(student.parentEmail).toBe('suresh@example.com');
      expect(student.admissionYear).toBe(2024);
      expect(student.isActive).toBe(true);
      expect(student.createdAt).toBeDefined();
      expect(student.updatedAt).toBeDefined();
    });

    it('should require studentId', async () => {
      const { studentId, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require schoolCode', async () => {
      const { schoolCode, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require userId', async () => {
      const { userId: _uid, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require name', async () => {
      const { name, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require class', async () => {
      const { class: _cls, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require section', async () => {
      const { section, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should require rollNumber', async () => {
      const { rollNumber, ...data } = validStudentData;
      await expect(Student.create(data)).rejects.toThrow();
    });

    it('should default isActive to true', async () => {
      const student = await Student.create(validStudentData);
      expect(student.isActive).toBe(true);
    });

    it('should only allow valid gender enum values', async () => {
      await expect(
        Student.create({ ...validStudentData, gender: 'invalid' })
      ).rejects.toThrow();
    });

    it('should accept male gender', async () => {
      const student = await Student.create({ ...validStudentData, gender: 'male' });
      expect(student.gender).toBe('male');
    });

    it('should accept female gender', async () => {
      const student = await Student.create({
        ...validStudentData,
        studentId: 'DPS-RKP-S-2024-002',
        gender: 'female',
      });
      expect(student.gender).toBe('female');
    });

    it('should accept other gender', async () => {
      const student = await Student.create({
        ...validStudentData,
        studentId: 'DPS-RKP-S-2024-003',
        gender: 'other',
      });
      expect(student.gender).toBe('other');
    });

    it('should lowercase parentEmail', async () => {
      const student = await Student.create({
        ...validStudentData,
        parentEmail: 'Suresh@Example.COM',
      });
      expect(student.parentEmail).toBe('suresh@example.com');
    });

    it('should trim string fields', async () => {
      const student = await Student.create({
        ...validStudentData,
        studentId: '  DPS-RKP-S-2024-004  ',
        schoolCode: '  DPS-RKP-001  ',
        name: '  Rahul Kumar  ',
        class: '  10  ',
        section: '  A  ',
        rollNumber: '  15  ',
        parentName: '  Suresh Kumar  ',
        parentPhone: '  9876543210  ',
        parentEmail: '  suresh2@example.com  ',
      });
      expect(student.studentId).toBe('DPS-RKP-S-2024-004');
      expect(student.schoolCode).toBe('DPS-RKP-001');
      expect(student.name).toBe('Rahul Kumar');
      expect(student.class).toBe('10');
      expect(student.section).toBe('A');
      expect(student.rollNumber).toBe('15');
      expect(student.parentName).toBe('Suresh Kumar');
      expect(student.parentPhone).toBe('9876543210');
      expect(student.parentEmail).toBe('suresh2@example.com');
    });

    it('should allow optional fields to be omitted', async () => {
      const student = await Student.create({
        studentId: 'DPS-RKP-S-2024-005',
        schoolCode: 'DPS-RKP-001',
        userId: new mongoose.Types.ObjectId(),
        name: 'Test Student',
        class: '10',
        section: 'A',
        rollNumber: '99',
      });
      expect(student.dob).toBeUndefined();
      expect(student.gender).toBeUndefined();
      expect(student.parentName).toBeUndefined();
      expect(student.parentPhone).toBeUndefined();
      expect(student.parentEmail).toBeUndefined();
      expect(student.admissionYear).toBeUndefined();
    });
  });

  describe('Indexes', () => {
    it('should have a unique index on studentId', () => {
      const indexes = Student.schema.indexes();
      const studentIdIndex = indexes.find(
        ([fields, opts]) => fields.studentId === 1 && opts.unique === true
      );
      expect(studentIdIndex).toBeDefined();
    });

    it('should have an index on schoolCode', () => {
      const indexes = Student.schema.indexes();
      const schoolCodeIndex = indexes.find(
        ([fields]) =>
          fields.schoolCode === 1 &&
          !fields.class &&
          !fields.section &&
          !fields.rollNumber
      );
      expect(schoolCodeIndex).toBeDefined();
    });

    it('should have a compound unique index on schoolCode + class + section + rollNumber', () => {
      const indexes = Student.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, opts]) =>
          fields.schoolCode === 1 &&
          fields.class === 1 &&
          fields.section === 1 &&
          fields.rollNumber === 1 &&
          opts.unique === true
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should enforce unique studentId', async () => {
      await Student.create(validStudentData);
      await expect(
        Student.create({
          ...validStudentData,
          rollNumber: '99',
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should enforce unique schoolCode + class + section + rollNumber combination', async () => {
      await Student.create(validStudentData);
      await expect(
        Student.create({
          ...validStudentData,
          studentId: 'DPS-RKP-S-2024-006',
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should allow same rollNumber in different sections', async () => {
      await Student.create(validStudentData);
      const student2 = await Student.create({
        ...validStudentData,
        studentId: 'DPS-RKP-S-2024-007',
        section: 'B',
        userId: new mongoose.Types.ObjectId(),
      });
      expect(student2.rollNumber).toBe('15');
      expect(student2.section).toBe('B');
    });

    it('should allow same rollNumber in different classes', async () => {
      await Student.create(validStudentData);
      const student2 = await Student.create({
        ...validStudentData,
        studentId: 'DPS-RKP-S-2024-008',
        class: '11',
        userId: new mongoose.Types.ObjectId(),
      });
      expect(student2.rollNumber).toBe('15');
      expect(student2.class).toBe('11');
    });

    it('should allow same rollNumber in different schools', async () => {
      await Student.create(validStudentData);
      const student2 = await Student.create({
        ...validStudentData,
        studentId: 'KV-DEL-S-2024-001',
        schoolCode: 'KV-DEL-001',
        userId: new mongoose.Types.ObjectId(),
      });
      expect(student2.rollNumber).toBe('15');
      expect(student2.schoolCode).toBe('KV-DEL-001');
    });
  });
});
