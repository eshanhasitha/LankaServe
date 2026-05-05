import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    preferredProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
    },
    images: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'accepted', 'arrived', 'ongoing', 'completed', 'paid', 'cancelled'],
        default: 'pending',
        index: true,
    },
    price: { type: Number, required: true, min: 0 },
    providerCompletion: { type: Boolean, default: false },
    customerCompletion: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    responseTimeMinutes: { type: Number, default: null },
    qrTokenHash: { type: String, default: null, select: false },
    qrTokenValue: { type: String, default: null, select: false },
    qrTokenExpiresAt: { type: Date, default: null },
    qrTokenUsedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

jobSchema.index({ location: '2dsphere' });
jobSchema.index({ providerId: 1, status: 1, category: 1 });
jobSchema.index({ preferredProviderId: 1, status: 1, createdAt: -1 });
jobSchema.index({ customerId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Job', jobSchema);
