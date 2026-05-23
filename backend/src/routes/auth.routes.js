const express = require("express");
const router = express.Router();

const {
  requestRegisterOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  requestForgotPasswordOtp,
  resendForgotPasswordOtp,
  resetPasswordWithOtp,
  loginUser,
  googleSignIn,
  updateProfilePhoto,
  updateMyLocation
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth.middleware");
const User = require("../models/User");

// Register (step 1: request OTP)
router.post("/register", requestRegisterOtp);
router.post("/register/request-otp", requestRegisterOtp);

// Register (step 2: verify OTP)
router.post("/register/verify-otp", verifyRegisterOtp);
router.post("/register/resend-otp", resendRegisterOtp);

// Login
router.post("/login", loginUser);
router.post("/google", googleSignIn);

// Forgot password
router.post("/forgot-password/request-otp", requestForgotPasswordOtp);
router.post("/forgot-password/resend-otp", resendForgotPasswordOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);

// 🔐 GET LOGGED-IN USER
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/profile-photo", authMiddleware, updateProfilePhoto);
router.patch("/location", authMiddleware, updateMyLocation);

router.get("/users-locations", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({
      "location.type": "Point",
      "location.coordinates.0": { $exists: true },
      "location.coordinates.1": { $exists: true }
    })
      .select("name email city profileImage location updatedAt")
      .lean();

    const normalized = users
      .map((user) => ({
        userId: String(user._id),
        name: String(user.name || "User"),
        email: String(user.email || ""),
        city: String(user.city || ""),
        profileImage: String(user.profileImage || ""),
        lat: Number(user.location?.coordinates?.[1]),
        lng: Number(user.location?.coordinates?.[0]),
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : ""
      }))
      .filter((user) => Number.isFinite(user.lat) && Number.isFinite(user.lng));

    res.json({ users: normalized });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user locations" });
  }
});

module.exports = router;
