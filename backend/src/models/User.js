const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    phone: String,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    verified: {
      type: Boolean,
      default: false   // admin can verify
    },

    blocked: {
      type: Boolean,
      default: false
    },

    trustScore: {
      type: Number,
      default: 50
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
