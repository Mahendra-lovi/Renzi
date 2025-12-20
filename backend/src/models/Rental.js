const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "active",
        "returned",
        "cancelled",
        "disputed"
      ],
      default: "requested"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
