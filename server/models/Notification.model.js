const mongoose = require('mongoose');

/**
 * Notification — an in-app/push/sms/email message addressed to a single user
 * (referenced by their string userId, not ObjectId).
 */
const notificationSchema = new mongoose.Schema(
  {
    schoolCode: { type: String, required: true, trim: true },
    userId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['absence', 'calendar', 'credential', 'system'],
    },
    channel: {
      type: String,
      required: true,
      enum: ['push', 'sms', 'email'],
    },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ schoolCode: 1, userId: 1, isRead: 1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);
