import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'arrived', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
  qrTokenHash: { type: String, select: false },
  qrTokenExpiresAt: Date,
  qrTokenUsedAt: Date,
  providerCompletion: { type: Boolean, default: false },
  customerCompletion: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);