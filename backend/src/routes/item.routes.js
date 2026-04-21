const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  createItem,
  getAllItems,
  getItemById,
  getNearbyItems,
  updateItem,
  deleteItem,
  getMyItems,
  searchItems,
  getSearchSuggestions
} = require("../controllers/item.controller");

router.post("/", auth, createItem);
router.get("/", getAllItems);
router.get("/my-items", auth, getMyItems);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/search", searchItems);
router.get("/nearby", getNearbyItems);
router.get("/:id", getItemById);

// 🔒 protected ownership routes
router.patch("/:id", auth, updateItem);
router.delete("/:id", auth, deleteItem);

module.exports = router;
