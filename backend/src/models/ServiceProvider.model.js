import mongoose from 'mongoose';

const serviceProviderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    categories: [{ type: String, required: true, index: true }],
    bio: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    yearsExperience: { type: Number, default: 0 },
    verificationDocs: [{ type: String }],
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
