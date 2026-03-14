const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({

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

  amount: Number,

  method: {
    type: String,
    enum: ["cash", "bank_transfer"]
  },

  status: {
    type: String,
    enum: ["paid", "pending"],
    default: "pending"
  },

  verified_by: String,

  payment_date: Date

});

module.exports = mongoose.model("Payment", PaymentSchema);