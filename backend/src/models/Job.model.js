import { Schema, model, Types } from 'mongoose';

const jobSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'arrived', 'ongoing', 'completed', 'cancelled'], default: 'pending', index: true },
}, { timestamps: true });

jobSchema.index({ customerId: 1, createdAt: -1 });
jobSchema.index({ providerId: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
export default model('Job', jobSchema);
