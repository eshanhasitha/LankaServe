import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
}, { _id: false });

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    authProvider: { type: String, enum: ['password', 'google'], default: 'password' },
    role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer', index: true },
    language: { type: String, enum: ['en', 'si', 'ta'], default: 'en' },
    profileImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [79.8612, 6.9271],
        },
    },
    fcmToken: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    refreshTokens: [refreshTokenSchema],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ location: '2dsphere' });

export default mongoose.model('User', userSchema);
