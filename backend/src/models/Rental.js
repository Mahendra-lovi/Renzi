const mongoose = require("mongoose");

const rentalChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

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

    purpose: {
      type: String,
      trim: true,
      default: ""
    },

    pickupPreference: {
      type: String,
      enum: ["pickup", "delivery", "flexible"],
      default: "pickup"
    },

    notes: {
      type: String,
      trim: true,
      default: ""
    },

    signatureName: {
      type: String,
      trim: true,
      default: ""
    },

    agreementAcceptedAt: {
      type: Date,
      default: null
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
    },

    disputeResolution: {
      type: String,
      enum: ["pending", "owner_fault", "renter_fault", "no_fault"],
      default: null
    },

    disputeNote: {
      type: String,
      default: ""
    },

    disputeResolvedAt: {
      type: Date,
      default: null
    },

    issueStatus: {
      type: String,
      enum: ["none", "reported", "resolved"],
      default: "none"
    },

    issueSeverity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: null
    },

    issueReportedAt: {
      type: Date,
      default: null
    },

    issueReportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    chatMessages: {
      type: [rentalChatMessageSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
