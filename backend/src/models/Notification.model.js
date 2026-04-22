import { Schema, model, Types } from 'mongoose';

const notificationSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['job', 'system', 'payment'], default: 'job' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Object, default: {} },
  isRead: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default model('Notification', notificationSchema);
