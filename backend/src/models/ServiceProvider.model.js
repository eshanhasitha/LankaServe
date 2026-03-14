const mongoose = require("mongoose");

const ServiceProviderSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: String,
    required: true
  },

  experience: {
    type: String
  },

  service_area: {
    type: String
  },

  average_rating: {
    type: Number,
    default: 0
  },

  completed_jobs: {
    type: Number,
    default: 0
  },

  availability_status: {
    type: String,
    default: "available"
  }

});

module.exports = mongoose.model("ServiceProvider", ServiceProviderSchema);