const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser
} = require("../controllers/auth.controller");

// Register (users only, NOT admin)
router.post("/register", registerUser);

// Login (users + admin)
router.post("/login", loginUser);

module.exports = router;
