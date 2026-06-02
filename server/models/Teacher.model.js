const mongoose = require('mongoose');

const assignedClassSchema = new mongoose.Schema(
  {
    class: { type: String, trim: true },
    section: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * Teacher — profile record linked 1:1 to a User with role 'teacher'.
 */
const teacherSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, trim: true },
    schoolCode: { type: String, required: true, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subjects: { type: [String], default: [] },
    assignedClasses: { type: [assignedClassSchema], default: [] },
    isClassTeacher: { type: Boolean, default: false },
    classTeacherOf: {
      type: new mongoose.Schema(
        {
          class: { type: String, trim: true },
          section: { type: String, trim: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────
teacherSchema.index({ teacherId: 1 }, { unique: true });
teacherSchema.index({ schoolCode: 1 });
teacherSchema.index({ schoolCode: 1, email: 1 }, { unique: true });

module.exports =
  mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
