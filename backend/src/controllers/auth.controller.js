const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, city, lat, lng } = req.body;

    if (role === "admin") {
      return res.status(403).json({ message: "Admin registration not allowed" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    const userPayload = {
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      city: String(city || "").trim()
    };

    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
      userPayload.location = {
        type: "Point",
        coordinates: [parsedLng, parsedLat]
      };
    }

    const user = await User.create(userPayload);

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN USER / ADMIN  🔑⬅️ THIS IS THE PART YOU ASKED ABOUT
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.blocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
