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

const paymentStageSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "pending_confirmation", "paid", "not_due"],
      default: "pending"
    },
    method: {
      type: String,
      enum: ["none", "site", "cash"],
      default: "none"
    },
    transactionRef: {
      type: String,
      trim: true,
      default: ""
    },
    paidAt: {
      type: Date,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    gatewayOrderId: {
      type: String,
      trim: true,
      default: ""
    },
    gatewayPaymentId: {
      type: String,
      trim: true,
      default: ""
    },
    gatewaySignature: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const paymentReceiptSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["advance", "final"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ["site", "cash"],
      required: true
    },
    status: {
      type: String,
      enum: ["paid", "pending_confirmation"],
      required: true
    },
    transactionRef: {
      type: String,
      trim: true,
      default: ""
    },
    gatewayOrderId: {
      type: String,
      trim: true,
      default: ""
    },
    gatewayPaymentId: {
      type: String,
      trim: true,
      default: ""
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { _id: true }
);

const paymentTimelineSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["advance", "final"],
      default: null
    },
    event: {
      type: String,
      required: true,
      trim: true
    },
    method: {
      type: String,
      enum: ["none", "site", "cash"],
      default: "none"
    },
    amount: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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

    payment: {
      advanceAmount: {
        type: Number,
        default: 0
      },
      finalAmount: {
        type: Number,
        default: 0
      },
      advance: {
        type: paymentStageSchema,
        default: () => ({ status: "pending", method: "none" })
      },
      final: {
        type: paymentStageSchema,
        default: () => ({ status: "not_due", method: "none" })
      },
      receipts: {
        type: [paymentReceiptSchema],
        default: []
      },
      timeline: {
        type: [paymentTimelineSchema],
        default: []
      }
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
