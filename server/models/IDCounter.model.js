const mongoose = require('mongoose');

/**
 * IDCounter — backs atomic, gap-free sequence generation for school codes,
 * teacher IDs and student IDs. One document per (schoolCode, type, year).
 */
const idCounterSchema = new mongoose.Schema(
  {
    schoolCode: { type: String, default: null, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['school', 'teacher', 'student'],
    },
    year: { type: Number, default: null },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One counter per school + type + year combination.
idCounterSchema.index(
  { schoolCode: 1, type: 1, year: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.IDCounter || mongoose.model('IDCounter', idCounterSchema);
