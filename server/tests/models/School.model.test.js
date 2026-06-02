import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import School from '../../models/School.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await School.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('School Model', () => {
  const validSchoolData = {
    name: 'Delhi Public School',
    abbreviation: 'DPS',
    cityCode: 'RKP',
    board: 'CBSE',
    address: '123 Main Road, Raipur',
    totalStudents: 500,
    contactName: 'Dr. Sharma',
    contactEmail: 'principal@dps.edu',
    contactPhone: '9876543210',
  };

  describe('Schema validation', () => {
    it('should create a school with all valid fields', async () => {
      const school = await School.create(validSchoolData);
      expect(school.name).toBe('Delhi Public School');
      expect(school.abbreviation).toBe('DPS');
      expect(school.cityCode).toBe('RKP');
      expect(school.board).toBe('CBSE');
      expect(school.address).toBe('123 Main Road, Raipur');
      expect(school.totalStudents).toBe(500);
      expect(school.contactName).toBe('Dr. Sharma');
      expect(school.contactEmail).toBe('principal@dps.edu');
      expect(school.contactPhone).toBe('9876543210');
      expect(school.status).toBe('pending');
      expect(school.schoolCode).toBeUndefined();
      expect(school.rejectionReason).toBeNull();
      expect(school.adminUserId).toBeNull();
      expect(school.createdAt).toBeDefined();
      expect(school.updatedAt).toBeDefined();
    });

    it('should default status to pending', async () => {
      const school = await School.create(validSchoolData);
      expect(school.status).toBe('pending');
    });

    it('should accept all valid status enum values', async () => {
      const statuses = ['pending', 'approved', 'rejected'];
      for (let i = 0; i < statuses.length; i++) {
        const school = await School.create({
          ...validSchoolData,
          name: `School ${i}`,
          address: `Address ${i}`,
          status: statuses[i],
        });
        expect(school.status).toBe(statuses[i]);
      }
    });

    it('should reject invalid status values', async () => {
      await expect(
        School.create({ ...validSchoolData, status: 'suspended' })
      ).rejects.toThrow();
    });

    it('should require name', async () => {
      const { name, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require board', async () => {
      const { board, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require address', async () => {
      const { address, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require totalStudents', async () => {
      const { totalStudents, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require contactName', async () => {
      const { contactName, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require contactEmail', async () => {
      const { contactEmail, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should require contactPhone', async () => {
      const { contactPhone, ...data } = validSchoolData;
      await expect(School.create(data)).rejects.toThrow();
    });

    it('should lowercase contactEmail', async () => {
      const school = await School.create({
        ...validSchoolData,
        contactEmail: 'Principal@DPS.EDU',
      });
      expect(school.contactEmail).toBe('principal@dps.edu');
    });

    it('should not have schoolCode set initially', async () => {
      const school = await School.create(validSchoolData);
      expect(school.schoolCode).toBeUndefined();
    });

    it('should allow setting schoolCode on approval', async () => {
      const school = await School.create(validSchoolData);
      school.schoolCode = 'DPS-RKP-001';
      school.status = 'approved';
      await school.save();
      expect(school.schoolCode).toBe('DPS-RKP-001');
      expect(school.status).toBe('approved');
    });

    it('should store rejectionReason when rejected', async () => {
      const school = await School.create({
        ...validSchoolData,
        status: 'rejected',
        rejectionReason: 'Incomplete documentation',
      });
      expect(school.rejectionReason).toBe('Incomplete documentation');
    });

    it('should store adminUserId when approved', async () => {
      const school = await School.create({
        ...validSchoolData,
        schoolCode: 'DPS-RKP-001',
        status: 'approved',
        adminUserId: 'DPS-RKP-001-admin',
      });
      expect(school.adminUserId).toBe('DPS-RKP-001-admin');
    });
  });

  describe('Indexes', () => {
    it('should have a sparse unique index on schoolCode', () => {
      const indexes = School.schema.indexes();
      const schoolCodeIndex = indexes.find(
        ([fields, opts]) =>
          fields.schoolCode === 1 && opts.unique === true && opts.sparse === true
      );
      expect(schoolCodeIndex).toBeDefined();
    });

    it('should have an index on status', () => {
      const indexes = School.schema.indexes();
      const statusIndex = indexes.find(
        ([fields]) => fields.status === 1
      );
      expect(statusIndex).toBeDefined();
    });

    it('should have a compound unique index on name + address', () => {
      const indexes = School.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields, opts]) =>
          fields.name === 1 && fields.address === 1 && opts.unique === true
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should enforce unique schoolCode when set', async () => {
      await School.create({
        ...validSchoolData,
        schoolCode: 'DPS-RKP-001',
      });
      await expect(
        School.create({
          ...validSchoolData,
          name: 'Another School',
          address: 'Different Address',
          schoolCode: 'DPS-RKP-001',
        })
      ).rejects.toThrow();
    });

    it('should allow multiple schools without schoolCode (sparse index)', async () => {
      await School.create(validSchoolData);
      const school2 = await School.create({
        ...validSchoolData,
        name: 'Another School',
        address: 'Different Address',
      });
      expect(school2.schoolCode).toBeUndefined();
    });

    it('should enforce unique name + address combination', async () => {
      await School.create(validSchoolData);
      await expect(
        School.create({ ...validSchoolData })
      ).rejects.toThrow();
    });

    it('should allow same name with different address', async () => {
      await School.create(validSchoolData);
      const school2 = await School.create({
        ...validSchoolData,
        address: '456 Other Road, Delhi',
      });
      expect(school2.name).toBe(validSchoolData.name);
    });

    it('should allow same address with different name', async () => {
      await School.create(validSchoolData);
      const school2 = await School.create({
        ...validSchoolData,
        name: 'Kendriya Vidyalaya',
      });
      expect(school2.address).toBe(validSchoolData.address);
    });
  });
});
