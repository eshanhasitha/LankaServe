import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'verified'], default: 'pending', index: true },
    providerPaid: { type: Boolean, default: false },
    customerConfirmed: { type: Boolean, default: false },
    adminVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ providerId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
