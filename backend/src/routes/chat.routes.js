const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const { getMyChats } = require("../controllers/chat.controller");

router.get("/", auth, getMyChats);

module.exports = router;