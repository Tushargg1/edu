const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User — authentication record for every actor in the system
 * (super_admin, school_admin, teacher, student).
 */
const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    schoolCode: { type: String, default: null, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'school_admin', 'teacher', 'student'],
    },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    fcmToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────
userSchema.index({ userId: 1 }, { unique: true });
userSchema.index({ schoolCode: 1, role: 1 });

// ── Hash password on create / change ────────────────────────────────
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method: compare a plaintext password to the stored hash ─
userSchema.methods.matchPassword = function matchPassword(candidate) {
  if (!candidate) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
