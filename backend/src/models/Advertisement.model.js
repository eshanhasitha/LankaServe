import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema({
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General Discount' },
    imageUrl: { type: String, required: true },
    budget: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'paused', 'ended'], default: 'pending', index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

advertisementSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

export default mongoose.model('Advertisement', advertisementSchema);
