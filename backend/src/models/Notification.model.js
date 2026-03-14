const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  title: String,

  message: String,

  type: {
    type: String,
    enum: ["job", "system", "payment", "offer"]
  },

  timestamp: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ["read", "unread"],
    default: "unread"
  }

});

module.exports = mongoose.model("Notification", NotificationSchema);