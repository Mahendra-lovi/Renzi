const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true
    },

    content: {
      type: String, // generated text
      required: true
    },

    ownerAccepted: {
      type: Boolean,
      default: false
    },

    renterAccepted: {
      type: Boolean,
      default: false
    },

    signedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agreement", agreementSchema);
