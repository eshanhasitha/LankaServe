import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['job', 'system', 'payment'], default: 'job' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Object, default: {} },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
