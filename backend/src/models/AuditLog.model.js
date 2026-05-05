import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
