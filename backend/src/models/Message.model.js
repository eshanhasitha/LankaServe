import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({

  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  text: String,

  timestamp: {
    type: Date,
    default: Date.now
  },

  is_read: {
    type: Boolean,
    default: false
  }

});

export default mongoose.model('Message', MessageSchema);