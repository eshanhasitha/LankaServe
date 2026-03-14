const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  address: {
    type: String
  },

  phone: {
    type: String
  },

  role: {
    type: String,
    enum: ["customer", "provider", "admin"],
    default: "customer"
  },

  profile_image: {
    type: String
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", UserSchema);