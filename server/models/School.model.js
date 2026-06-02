const mongoose = require('mongoose');

/**
 * School — a tenant in the multi-school platform. Created in `pending`
 * status on registration; a schoolCode is assigned on approval.
 */
const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    abbreviation: { type: String, trim: true },
    cityCode: { type: String, trim: true },
    board: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    totalStudents: { type: Number, required: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // schoolCode is intentionally left unset until approval (sparse unique).
    schoolCode: { type: String },
    rejectionReason: { type: String, default: null },
    adminUserId: { type: String, default: null },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────
schoolSchema.index({ schoolCode: 1 }, { unique: true, sparse: true });
schoolSchema.index({ status: 1 });
schoolSchema.index({ name: 1, address: 1 }, { unique: true });

module.exports = mongoose.models.School || mongoose.model('School', schoolSchema);
