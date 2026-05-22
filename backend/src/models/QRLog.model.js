import mongoose from 'mongoose';

const qrLogSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['success', 'failed', 'expired', 'used'], required: true, index: true },
    reason: { type: String, default: '' },
    tokenHash: { type: String, required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

qrLogSchema.index({ jobId: 1, createdAt: -1 });

export default mongoose.model('QRLog', qrLogSchema);
