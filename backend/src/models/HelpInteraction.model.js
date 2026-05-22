import mongoose from 'mongoose';

const helpInteractionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

helpInteractionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('HelpInteraction', helpInteractionSchema);
