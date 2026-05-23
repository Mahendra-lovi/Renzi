const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords) =>
          Array.isArray(coords) &&
          coords.length === 2 &&
          Number.isFinite(coords[0]) &&
          Number.isFinite(coords[1]),
        message: "location.coordinates must be [lng, lat]"
      }
    }
  },
  { _id: false }
);

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

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    googleId: {
      type: String,
      default: ""
    },

    phone: String,

    profileImage: {
      type: String,
      default: ""
    },

    city: {
      type: String,
      trim: true,
      default: ""
    },

    location: {
      type: pointSchema,
      default: undefined
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    verified: {
      type: Boolean,
      default: false   // admin can verify
    },

    emailVerifiedAt: {
      type: Date,
      default: null
    },

    emailOtpHash: {
      type: String,
      default: ""
    },

    emailOtpExpiresAt: {
      type: Date,
      default: null
    },

    emailOtpRequestedAt: {
      type: Date,
      default: null
    },

    passwordResetOtpHash: {
      type: String,
      default: ""
    },

    passwordResetOtpExpiresAt: {
      type: Date,
      default: null
    },

    passwordResetOtpRequestedAt: {
      type: Date,
      default: null
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

userSchema.pre("validate", function cleanupInvalidLocation() {
  if (!this.location) return;

  const coords = this.location.coordinates;
  const validCoords =
    Array.isArray(coords) &&
    coords.length === 2 &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1]);

  if (this.location.type !== "Point" || !validCoords) {
    this.location = undefined;
  }
});

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
