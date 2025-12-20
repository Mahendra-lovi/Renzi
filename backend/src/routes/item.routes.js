const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  createItem,
  getAllItems,
  updateItem,
  deleteItem
} = require("../controllers/item.controller");

router.post("/", auth, createItem);
router.get("/", getAllItems);

// 🔒 protected ownership routes
router.patch("/:id", auth, updateItem);
router.delete("/:id", auth, deleteItem);

module.exports = router;
