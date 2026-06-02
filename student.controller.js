import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  generateSchoolCode,
  generateTeacherId,
  generateStudentId,
  parseId,
} from '../../services/id.service.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  // Use mongoose.model to get the already-compiled IDCounter model
  const IDCounter = mongoose.model('IDCounter');
  await IDCounter.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('ID Generator Service', () => {
  describe('generateSchoolCode', () => {
    it('should generate a school code in the format ABBR-CITY-NNN', async () => {
      const code = await generateSchoolCode('DPS', 'RKP');
      expect(code).toBe('DPS-RKP-001');
    });

    it('should zero-pad the sequence to 3 digits', async () => {
      const code = await generateSchoolCode('ABC', 'DEL');
      expect(code).toMatch(/^ABC-DEL-\d{3}$/);
    });

    it('should increment sequence on successive calls', async () => {
      const code1 = await generateSchoolCode('DPS', 'RKP');
      const code2 = await generateSchoolCode('DPS', 'RKP');
      const code3 = await generateSchoolCode('DPS', 'RKP');
      expect(code1).toBe('DPS-RKP-001');
      expect(code2).toBe('DPS-RKP-002');
      expect(code3).toBe('DPS-RKP-003');
    });

    it('should uppercase the abbreviation and city code', async () => {
      const code = await generateSchoolCode('dps', 'rkp');
      expect(code).toBe('DPS-RKP-001');
    });

    it('should share a single global school counter (schoolCode=null)', async () => {
      // Different abbreviation/city but same global counter
      const code1 = await generateSchoolCode('DPS', 'RKP');
      const code2 = await generateSchoolCode('KV', 'DEL');
      expect(code1).toBe('DPS-RKP-001');
      expect(code2).toBe('KV-DEL-002');
    });
  });

  describe('generateTeacherId', () => {
    it('should generate a teacher ID in the format ABBR-CITY-T-NNN', async () => {
      const id = await generateTeacherId('DPS-RKP-001');
      expect(id).toBe('DPS-RKP-T-001');
    });

    it('should increment sequence on successive calls for the same school', async () => {
      const id1 = await generateTeacherId('DPS-RKP-001');
      const id2 = await generateTeacherId('DPS-RKP-001');
      expect(id1).toBe('DPS-RKP-T-001');
      expect(id2).toBe('DPS-RKP-T-002');
    });

    it('should maintain separate sequences for different schools', async () => {
      const id1 = await generateTeacherId('DPS-RKP-001');
      const id2 = await generateTeacherId('DPS-RKP-001');
      const id3 = await generateTeacherId('KV-DEL-001');
      expect(id1).toBe('DPS-RKP-T-001');
      expect(id2).toBe('DPS-RKP-T-002');
      expect(id3).toBe('KV-DEL-T-001');
    });

    it('should parse abbreviation and city from the school code', async () => {
      const id = await generateTeacherId('ABC-XYZ-005');
      expect(id).toBe('ABC-XYZ-T-001');
    });
  });

  describe('generateStudentId', () => {
    it('should generate a student ID in the format ABBR-CITY-S-YYYY-NNN', async () => {
      const id = await generateStudentId('DPS-RKP-001', 2024);
      expect(id).toBe('DPS-RKP-S-2024-001');
    });

    it('should increment sequence on successive calls for the same school and year', async () => {
      const id1 = await generateStudentId('DPS-RKP-001', 2024);
      const id2 = await generateStudentId('DPS-RKP-001', 2024);
      expect(id1).toBe('DPS-RKP-S-2024-001');
      expect(id2).toBe('DPS-RKP-S-2024-002');
    });

    it('should maintain separate sequences for different years', async () => {
      const id1 = await generateStudentId('DPS-RKP-001', 2023);
      const id2 = await generateStudentId('DPS-RKP-001', 2024);
      expect(id1).toBe('DPS-RKP-S-2023-001');
      expect(id2).toBe('DPS-RKP-S-2024-001');
    });

    it('should maintain separate sequences for different schools', async () => {
      const id1 = await generateStudentId('DPS-RKP-001', 2024);
      const id2 = await generateStudentId('KV-DEL-001', 2024);
      expect(id1).toBe('DPS-RKP-S-2024-001');
      expect(id2).toBe('KV-DEL-S-2024-001');
    });
  });

  describe('parseId', () => {
    it('should parse a school code', () => {
      const result = parseId('DPS-RKP-001');
      expect(result).toEqual({
        type: 'school',
        abbreviation: 'DPS',
        cityCode: 'RKP',
        sequence: '001',
      });
    });

    it('should parse a teacher ID', () => {
      const result = parseId('DPS-RKP-T-012');
      expect(result).toEqual({
        type: 'teacher',
        abbreviation: 'DPS',
        cityCode: 'RKP',
        sequence: '012',
      });
    });

    it('should parse a student ID', () => {
      const result = parseId('DPS-RKP-S-2024-047');
      expect(result).toEqual({
        type: 'student',
        abbreviation: 'DPS',
        cityCode: 'RKP',
        year: '2024',
        sequence: '047',
      });
    });

    it('should return null for null input', () => {
      expect(parseId(null)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(parseId(123)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseId('')).toBeNull();
    });

    it('should return null for unrecognized format', () => {
      expect(parseId('INVALID')).toBeNull();
      expect(parseId('A-B')).toBeNull();
      expect(parseId('A-B-C-D-E-F')).toBeNull();
    });

    it('should round-trip a generated school code', async () => {
      const code = await generateSchoolCode('DPS', 'RKP');
      const parsed = parseId(code);
      expect(parsed.type).toBe('school');
      const reconstructed = `${parsed.abbreviation}-${parsed.cityCode}-${parsed.sequence}`;
      expect(reconstructed).toBe(code);
    });

    it('should round-trip a generated teacher ID', async () => {
      const id = await generateTeacherId('DPS-RKP-001');
      const parsed = parseId(id);
      expect(parsed.type).toBe('teacher');
      const reconstructed = `${parsed.abbreviation}-${parsed.cityCode}-T-${parsed.sequence}`;
      expect(reconstructed).toBe(id);
    });

    it('should round-trip a generated student ID', async () => {
      const id = await generateStudentId('DPS-RKP-001', 2024);
      const parsed = parseId(id);
      expect(parsed.type).toBe('student');
      const reconstructed = `${parsed.abbreviation}-${parsed.cityCode}-S-${parsed.year}-${parsed.sequence}`;
      expect(reconstructed).toBe(id);
    });
  });
});
