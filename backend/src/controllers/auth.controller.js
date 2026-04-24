const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { isSmtpConfigured, sendOtpEmail } = require("../utils/email");

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const createOtpCode = () => String(crypto.randomInt(100000, 1000000));
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const buildLocation = (lat, lng) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return undefined;
  }

  return {
    type: "Point",
    coordinates: [parsedLng, parsedLat]
  };
};

// START REGISTRATION BY SENDING EMAIL OTP
exports.requestRegisterOtp = async (req, res) => {
  try {
    const { name, email, password, phone, role, city, lat, lng } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (role === "admin") {
      return res.status(403).json({ message: "Admin registration not allowed" });
    }

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        message: "OTP email cannot be sent because SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env, then restart the backend."
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser?.authProvider === "google" && existingUser?.verified) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (existingUser?.verified) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = createOtpCode();
    const otpHash = hashOtp(otp);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);
    const location = buildLocation(lat, lng);

    const nextValues = {
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: "user",
      city: String(city || "").trim(),
      authProvider: "local",
      emailOtpHash: otpHash,
      emailOtpExpiresAt: otpExpiry,
      emailOtpRequestedAt: new Date()
    };

    if (location) {
      nextValues.location = location;
    }

    if (existingUser) {
      Object.assign(existingUser, nextValues);
      await existingUser.save();
    } else {
      await User.create(nextValues);
    }

    await sendOtpEmail({ toEmail: normalizedEmail, name, otp });

    res.status(200).json({
      message: "OTP sent to email. Verify to complete registration."
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// COMPLETE REGISTRATION USING EMAIL OTP
exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verified) {
      const token = createToken(user);
      return res.json({ message: "User already verified", token });
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      return res.status(400).json({ message: "No OTP request found for this account" });
    }

    if (user.emailOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP" });
    }

    if (hashOtp(otp) !== user.emailOtpHash) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    user.verified = true;
    user.emailVerifiedAt = new Date();
    user.emailOtpHash = "";
    user.emailOtpExpiresAt = null;
    user.emailOtpRequestedAt = null;
    await user.save();

    const token = createToken(user);

    res.status(200).json({
      message: "Email verified. Registration complete.",
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// RESEND EMAIL OTP FOR REGISTRATION
exports.resendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        message: "OTP email cannot be resent because SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env, then restart the backend."
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (user.emailOtpRequestedAt) {
      const secondsSinceLastOtp = Math.floor((Date.now() - user.emailOtpRequestedAt.getTime()) / 1000);
      if (secondsSinceLastOtp < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp}s before requesting another OTP`
        });
      }
    }

    const otp = createOtpCode();
    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.emailOtpRequestedAt = new Date();
    await user.save();

    await sendOtpEmail({ toEmail: user.email, name: user.name, otp });

    return res.status(200).json({
      message: "OTP resent successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// LOGIN USER / ADMIN  🔑⬅️ THIS IS THE PART YOU ASKED ABOUT
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.blocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Verify your email with OTP before login" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GOOGLE SIGN-IN
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google auth is not configured" });
    }

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);
    const googleId = payload?.sub;
    const emailVerified = payload?.email_verified;
    const name = payload?.name || "Google User";

    if (!email || !googleId || !emailVerified) {
      return res.status(401).json({ message: "Google account email is not verified" });
    }

    let user = await User.findOne({ email });

    if (user?.blocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    if (user) {
      user.googleId = googleId;
      user.verified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      await user.save();
    } else {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name,
        email,
        password: hashedPassword,
        authProvider: "google",
        googleId,
        role: "user",
        verified: true,
        emailVerifiedAt: new Date()
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Google login successful",
      token
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD - SEND OTP
exports.requestForgotPasswordOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        message: "OTP email cannot be sent because SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env, then restart the backend."
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    const otp = createOtpCode();
    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.passwordResetOtpRequestedAt = new Date();
    await user.save();

    await sendOtpEmail({ toEmail: user.email, name: user.name, otp });

    return res.status(200).json({ message: "Password reset OTP sent to your email." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD - RESEND OTP
exports.resendForgotPasswordOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isSmtpConfigured()) {
      return res.status(503).json({
        message: "OTP email cannot be resent because SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env, then restart the backend."
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    if (user.passwordResetOtpRequestedAt) {
      const secondsSinceLastOtp = Math.floor((Date.now() - user.passwordResetOtpRequestedAt.getTime()) / 1000);
      if (secondsSinceLastOtp < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp}s before requesting another OTP`
        });
      }
    }

    const otp = createOtpCode();
    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.passwordResetOtpRequestedAt = new Date();
    await user.save();

    await sendOtpEmail({ toEmail: user.email, name: user.name, otp });

    return res.status(200).json({ message: "Password reset OTP resent successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD - RESET WITH OTP
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in" });
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "No password reset OTP request found" });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new OTP" });
    }

    if (hashOtp(otp) !== user.passwordResetOtpHash) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtpHash = "";
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpRequestedAt = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful. Please login." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
