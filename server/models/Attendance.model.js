const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late'],
    },
    notified: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Attendance — one document per (school, class, section, date) holding the
 * status of every student for that day.
 */
const attendanceSchema = new mongoose.Schema(
  {
    schoolCode: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    records: { type: [recordSchema], default: [] },
  },
  { timestamps: true }
);

// One attendance sheet per class-section per day per school.
attendanceSchema.index(
  { schoolCode: 1, class: 1, section: 1, date: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
