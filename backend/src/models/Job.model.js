const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({

  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider"
  },

  title: String,

  description: String,

  category: String,

  budget: Number,

  images: [String],

  location: String,

  status: {
    type: String,
    enum: ["pending", "accepted", "completed"],
    default: "pending"
  },

  created_at: {
    type: Date,
    default: Date.now
  },

  completed_at: Date,

  arrival_confirmed: Boolean,

  arrival_time: Date,

  provider_completion: Boolean,

  customer_completion: Boolean,

  qr_code_token: String

});

module.exports = mongoose.model("Job", JobSchema);