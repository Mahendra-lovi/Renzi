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
  googleSignIn
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

module.exports = router;
