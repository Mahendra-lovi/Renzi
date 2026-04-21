const mongoose = require("mongoose");

const caseFileSchema = new mongoose.Schema(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      unique: true
    },

    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agreement",
      default: null
    },

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

    incidentType: {
      type: String,
      enum: [
        "not_returned",
        "property_damage",
        "harassment",
        "violent_behavior",
        "payment_issue",
        "other"
      ],
      default: "other"
    },

    incidentDescription: {
      type: String,
      default: ""
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },

    agreementSnapshot: {
      type: String,
      default: ""
    },

    legalIntentAcknowledged: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["open", "under_review", "escalated", "closed"],
      default: "open"
    },

    resolutionNote: {
      type: String,
      default: ""
    },

    closedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CaseFile", caseFileSchema);
