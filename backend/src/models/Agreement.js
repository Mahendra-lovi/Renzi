const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      unique: true
    },

    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    totalPrice: {
      type: Number,
      required: true
    },

    content: {
      type: String,
      required: true
    },

    ownerSigned: {
      type: Boolean,
      default: false
    },

    renterSigned: {
      type: Boolean,
      default: false
    },

    ownerSignedAt: {
      type: Date
    },

    renterSignedAt: {
      type: Date
    },

    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agreement", agreementSchema);
