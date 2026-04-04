import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({

  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job"
  },

  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider"
  },

  rating: Number,

  comment: String,

  feedback_category: {
    type: String,
    enum: ["positive", "neutral", "negative"]
  },

  date: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model('Review', ReviewSchema);