import mongoose from 'mongoose';

const adminRefreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { _id: false });

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'support_admin', 'finance_admin'],
    default: 'support_admin',
    index: true,
  },
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  refreshTokens: { type: [adminRefreshTokenSchema], select: false, default: [] },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
