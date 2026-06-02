const mongoose = require('mongoose');

/**
 * Student — profile record linked 1:1 to a User with role 'student'.
 */
const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    schoolCode: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },
    admissionYear: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ schoolCode: 1 });
studentSchema.index(
  { schoolCode: 1, class: 1, section: 1, rollNumber: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Student || mongoose.model('Student', studentSchema);
