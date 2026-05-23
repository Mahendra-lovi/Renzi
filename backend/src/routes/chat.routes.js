const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const { getMyChats, markThreadSeen } = require("../controllers/chat.controller");

router.get("/", auth, getMyChats);
router.patch("/:threadId/seen", auth, markThreadSeen);

module.exports = router;