const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  createItem,
  getAllItems,
  getItemById,
  getNearbyItems,
  getItemsByOwner,
  updateItem,
  deleteItem,
  getMyItems,
  searchItems,
  getSearchSuggestions,
  getItemChatThread,
  sendItemChatMessage
} = require("../controllers/item.controller");

router.post("/", auth, createItem);
router.get("/", getAllItems);
router.get("/my-items", auth, getMyItems);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/search", searchItems);
router.get("/nearby", getNearbyItems);
router.get("/by-owner/:ownerId", getItemsByOwner);
router.get("/:id/chat-thread", auth, getItemChatThread);
router.post("/:id/chat-thread/messages", auth, sendItemChatMessage);
router.get("/:id", getItemById);

// 🔒 protected ownership routes
router.patch("/:id", auth, updateItem);
router.delete("/:id", auth, deleteItem);

module.exports = router;
