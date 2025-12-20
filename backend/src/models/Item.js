const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String
    },

    category: {
      type: String,
      required: true
    },

    pricePerDay: {
      type: Number,
      required: true
    },

    images: {
      type: [String], // Cloudinary URLs
      validate: [arr => arr.length <= 5, "Max 5 images allowed"]
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Old"],
      default: "Good"
    },

    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
