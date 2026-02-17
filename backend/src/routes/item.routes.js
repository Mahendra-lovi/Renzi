const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
  getMyItems
} = require("../controllers/item.controller");

router.post("/", auth, createItem);
router.get("/", getAllItems);
router.get("/my-items", auth, getMyItems);

// 🔒 protected ownership routes
router.patch("/:id", auth, updateItem);
router.delete("/:id", auth, deleteItem);

module.exports = router;
