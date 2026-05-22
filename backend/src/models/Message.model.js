import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    threadId: { type: String, required: true, index: true },
    contextType: { type: String, enum: ['direct', 'job'], default: 'direct', index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null, index: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ threadId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
