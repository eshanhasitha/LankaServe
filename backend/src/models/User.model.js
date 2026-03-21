import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: String,
  name: String,
  email: String,
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
