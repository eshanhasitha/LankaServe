import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  title: String,
  description: String,
  category: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [79.8612, 6.9271] }
  },
  price: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'arrived', 'ongoing', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
