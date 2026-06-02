import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/User.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Model', () => {
  const validUserData = {
    userId: 'DPS-RKP-T-001',
    schoolCode: 'DPS-RKP-001',
    role: 'teacher',
    password: 'plainPassword123',
    name: 'Test Teacher',
    email: 'teacher@school.com',
    phone: '9876543210',
  };

  describe('Schema validation', () => {
    it('should create a user with all valid fields', async () => {
      const user = await User.create(validUserData);
      expect(user.userId).toBe('DPS-RKP-T-001');
      expect(user.schoolCode).toBe('DPS-RKP-001');
      expect(user.role).toBe('teacher');
      expect(user.name).toBe('Test Teacher');
      expect(user.email).toBe('teacher@school.com');
      expect(user.phone).toBe('9876543210');
      expect(user.isActive).toBe(true);
      expect(user.fcmToken).toBeNull();
      expect(user.refreshToken).toBeNull();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should reject invalid role values', async () => {
      await expect(
        User.create({ ...validUserData, role: 'principal' })
      ).rejects.toThrow();
    });

    it('should accept all valid role enum values', async () => {
      const roles = ['super_admin', 'school_admin', 'teacher', 'student'];
      for (const role of roles) {
        const user = await User.create({
          ...validUserData,
          userId: `user-${role}`,
          role,
        });
        expect(user.role).toBe(role);
      }
    });

    it('should require userId', async () => {
      const { userId, ...data } = validUserData;
      await expect(User.create(data)).rejects.toThrow();
    });

    it('should require role', async () => {
      const { role, ...data } = validUserData;
      await expect(User.create(data)).rejects.toThrow();
    });

    it('should require password', async () => {
      const { password, ...data } = validUserData;
      await expect(User.create(data)).rejects.toThrow();
    });

    it('should require name', async () => {
      const { name, ...data } = validUserData;
      await expect(User.create(data)).rejects.toThrow();
    });

    it('should enforce unique userId', async () => {
      await User.create(validUserData);
      await expect(
        User.create({ ...validUserData, email: 'other@school.com' })
      ).rejects.toThrow();
    });

    it('should default isActive to true', async () => {
      const user = await User.create(validUserData);
      expect(user.isActive).toBe(true);
    });

    it('should default schoolCode to null for super_admin', async () => {
      const user = await User.create({
        userId: 'super-admin-001',
        role: 'super_admin',
        password: 'adminPass123',
        name: 'Super Admin',
      });
      expect(user.schoolCode).toBeNull();
    });
  });

  describe('Pre-save hook — password hashing', () => {
    it('should hash the password on creation with bcrypt salt 12', async () => {
      const user = await User.create(validUserData);
      expect(user.password).not.toBe('plainPassword123');
      // bcrypt hashes start with $2a$ or $2b$ followed by the cost factor
      expect(user.password).toMatch(/^\$2[ab]\$12\$/);
    });

    it('should re-hash the password when modified', async () => {
      const user = await User.create(validUserData);
      const firstHash = user.password;

      user.password = 'newPassword456';
      await user.save();

      expect(user.password).not.toBe('newPassword456');
      expect(user.password).not.toBe(firstHash);
      expect(user.password).toMatch(/^\$2[ab]\$12\$/);
    });

    it('should not re-hash the password when other fields change', async () => {
      const user = await User.create(validUserData);
      const originalHash = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('matchPassword instance method', () => {
    it('should return true for correct password', async () => {
      const user = await User.create(validUserData);
      const isMatch = await user.matchPassword('plainPassword123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create(validUserData);
      const isMatch = await user.matchPassword('wrongPassword');
      expect(isMatch).toBe(false);
    });

    it('should return false for empty string', async () => {
      const user = await User.create(validUserData);
      const isMatch = await user.matchPassword('');
      expect(isMatch).toBe(false);
    });
  });

  describe('Indexes', () => {
    it('should have a unique index on userId', () => {
      const indexes = User.schema.indexes();
      const userIdIndex = indexes.find(
        ([fields, opts]) => fields.userId === 1 && opts.unique === true
      );
      expect(userIdIndex).toBeDefined();
    });

    it('should have a compound index on schoolCode + role', () => {
      const indexes = User.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) => fields.schoolCode === 1 && fields.role === 1
      );
      expect(compoundIndex).toBeDefined();
    });
  });
});
