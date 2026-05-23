const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
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

const conversationSchema = new mongoose.Schema(
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
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      default: null
    },
    messages: {
      type: [chatMessageSchema],
      default: []
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    ownerLastSeenAt: {
      type: Date,
      default: null
    },
    renterLastSeenAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

conversationSchema.index({ item: 1, owner: 1, renter: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
