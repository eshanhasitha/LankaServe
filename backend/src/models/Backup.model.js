import mongoose from 'mongoose';

const backupSchema = new mongoose.Schema({
    fileName: { type: String, required: true, trim: true },
    driveFileId: { type: String, default: '', index: true },
    driveWebViewLink: { type: String, default: '' },
    localFilePath: { type: String, default: '' },
    source: { type: String, enum: ['google_drive', 'local'], default: 'google_drive' },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'restoring', 'restored'],
        default: 'pending',
        index: true,
    },
    sizeBytes: { type: Number, default: 0 },
    databaseName: { type: String, default: '' },
    collections: [{
        name: { type: String, required: true },
        documentCount: { type: Number, default: 0 },
    }],
    error: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    completedAt: { type: Date, default: null },
    restoredAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

backupSchema.index({ createdAt: -1 });

export default mongoose.model('Backup', backupSchema);
