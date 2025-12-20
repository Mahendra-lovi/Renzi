const express = require("express");
const router = express.Router();
const User = require("../models/User");

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

// Approve user
router.patch("/approve/:id", auth, role(["admin"]), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { verified: true });
  res.json({ message: "User approved" });
});

// Block user
router.patch("/block/:id", auth, role(["admin"]), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { blocked: true });
  res.json({ message: "User blocked" });
});

module.exports = router;
