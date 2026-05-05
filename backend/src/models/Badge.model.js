import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    weight: { type: Number, default: 0 },
    minRating: { type: Number, default: 0 },
    minCompletedJobs: { type: Number, default: 0 },
    maxResponseTimeMinutes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Badge', badgeSchema);
