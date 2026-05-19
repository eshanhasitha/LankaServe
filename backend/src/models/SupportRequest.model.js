import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['customer', 'provider', 'admin'], required: true, index: true },
    category: {
        type: String,
        enum: ['Payment Issue', 'Technical Problem', 'Account Access', 'Verification Help', 'Job Issue', 'Other'],
        required: true,
    },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    attachments: [{
        url: { type: String, required: true },
        name: { type: String, default: '' },
        type: { type: String, default: '' },
    }],
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        index: true,
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
    },
    adminNotes: { type: String, default: '' },
    closedAt: { type: Date, default: null },
}, { timestamps: true });

supportRequestSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('SupportRequest', supportRequestSchema);
