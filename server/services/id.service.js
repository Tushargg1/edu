const IDCounter = require('../models/IDCounter.model');

/**
 * Atomically obtain the next sequence value for a counter identified by
 * (schoolCode, type, year). Creates the counter on first use.
 *
 * @returns {Promise<number>} the incremented sequence value
 */
async function nextSequence(schoolCode, type, year) {
  const counter = await IDCounter.findOneAndUpdate(
    { schoolCode, type, year },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true, new: true }
  );
  return counter.sequence;
}

const pad3 = (n) => String(n).padStart(3, '0');

/**
 * Generate a globally-unique school code: ABBR-CITY-NNN.
 * All school codes share one global counter (schoolCode = null).
 */
async function generateSchoolCode(abbreviation, cityCode) {
  const abbr = String(abbreviation).toUpperCase();
  const city = String(cityCode).toUpperCase();
  const seq = await nextSequence(null, 'school', null);
  return `${abbr}-${city}-${pad3(seq)}`;
}

/**
 * Generate a teacher ID: ABBR-CITY-T-NNN.
 * Sequence is per-school.
 */
async function generateTeacherId(schoolCode) {
  const { abbreviation, cityCode } = parseId(schoolCode);
  const seq = await nextSequence(schoolCode, 'teacher', null);
  return `${abbreviation}-${cityCode}-T-${pad3(seq)}`;
}

/**
 * Generate a student ID: ABBR-CITY-S-YYYY-NNN.
 * Sequence is per-school, per-admission-year.
 */
async function generateStudentId(schoolCode, year) {
  const { abbreviation, cityCode } = parseId(schoolCode);
  const seq = await nextSequence(schoolCode, 'student', year);
  return `${abbreviation}-${cityCode}-S-${year}-${pad3(seq)}`;
}

/**
 * Parse any generated ID back into its components. Returns null for
 * unrecognized input.
 *
 *   school : ABBR-CITY-NNN          → { type:'school',  abbreviation, cityCode, sequence }
 *   teacher: ABBR-CITY-T-NNN        → { type:'teacher', abbreviation, cityCode, sequence }
 *   student: ABBR-CITY-S-YYYY-NNN   → { type:'student', abbreviation, cityCode, year, sequence }
 */
function parseId(id) {
  if (typeof id !== 'string' || id.length === 0) return null;

  const parts = id.split('-');

  // Student: ABBR-CITY-S-YYYY-NNN (5 parts)
  if (parts.length === 5 && parts[2] === 'S') {
    return {
      type: 'student',
      abbreviation: parts[0],
      cityCode: parts[1],
      year: parts[3],
      sequence: parts[4],
    };
  }

  // Teacher: ABBR-CITY-T-NNN (4 parts)
  if (parts.length === 4 && parts[2] === 'T') {
    return {
      type: 'teacher',
      abbreviation: parts[0],
      cityCode: parts[1],
      sequence: parts[3],
    };
  }

  // School: ABBR-CITY-NNN (3 parts)
  if (parts.length === 3) {
    return {
      type: 'school',
      abbreviation: parts[0],
      cityCode: parts[1],
      sequence: parts[2],
    };
  }

  return null;
}

module.exports = {
  generateSchoolCode,
  generateTeacherId,
  generateStudentId,
  parseId,
};
