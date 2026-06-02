const mongoose = require('mongoose');

/**
 * CalendarEvent — a school-scoped event (holiday, exam, PTM, etc.).
 */
const calendarEventSchema = new mongoose.Schema(
  {
    schoolCode: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    eventType: {
      type: String,
      required: true,
      enum: ['Holiday', 'Exam', 'School_Event', 'PTM', 'Vacation'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// endDate must be on or after startDate.
calendarEventSchema.pre('validate', function validateDates(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date must be on or after start date'));
  }
  next();
});

calendarEventSchema.index({ schoolCode: 1, startDate: 1 });

module.exports =
  mongoose.models.CalendarEvent ||
  mongoose.model('CalendarEvent', calendarEventSchema);
