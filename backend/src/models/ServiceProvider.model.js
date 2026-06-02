import mongoose from 'mongoose';

const providerVerificationSchema = new mongoose.Schema({
    legalName: { type: String, default: '', trim: true },
    nicNumber: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    serviceArea: { type: String, default: '', trim: true },
    businessRegistrationNumber: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: {
        type: String,
        enum: ['not_submitted', 'pending', 'verified', 'rejected'],
        default: 'not_submitted',
        index: true,
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true },
}, { _id: false });

const serviceProviderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    categories: [{ type: String, required: true, index: true }],
    bio: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    yearsExperience: { type: Number, default: 0 },
    verificationDocs: [{ type: String }],
    verification: { type: providerVerificationSchema, default: () => ({}) },
    verified: { type: Boolean, default: false, index: true },
    availability: { type: String, enum: ['online', 'offline'], default: 'offline', index: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [79.8612, 6.9271] },
    },
    stats: {
        averageRating: { type: Number, default: 0 },
        completedJobs: { type: Number, default: 0 },
        completionRate: { type: Number, default: 0 },
        responseSpeedScore: { type: Number, default: 0 },
        avgResponseTimeMinutes: { type: Number, default: 9999 },
        rankingScore: { type: Number, default: 0, index: true },
    },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

serviceProviderSchema.index({ location: '2dsphere' });
serviceProviderSchema.index({ categories: 1, verified: 1, 'stats.rankingScore': -1 });

export default mongoose.model('ServiceProvider', serviceProviderSchema);
