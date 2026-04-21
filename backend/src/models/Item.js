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
    },

    city: {
      type: String,
      trim: true,
      default: ""
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },

    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

itemSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Item", itemSchema);
