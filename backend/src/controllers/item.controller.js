const Item = require("../models/Item");
const Rental = require("../models/Rental"); // we’ll create model soon

/**
 * CREATE ITEM
 * Any logged-in user can create an item
 */
exports.createItem = async (req, res) => {
  try {
    const item = await Item.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      pricePerDay: req.body.pricePerDay,
      images: req.body.images || [],
      owner: req.user.id   // 🔐 comes from JWT
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET ALL ITEMS (public)
 */
exports.getAllItems = async (req, res) => {
  const items = await Item.find().populate("owner", "email");
  res.json(items);
};

/**
 * UPDATE ITEM
 * Only owner can update
 * Item must NOT be currently rented
 */
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    // 1️⃣ item exists?
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ ownership check
    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not item owner" });
    }

    // 3️⃣ rental lock check
    const activeRental = await Rental.findOne({
      item: item._id,
      status: { $in: ["requested", "approved", "active"] }
    });

    if (activeRental) {
      return res.status(403).json({
        message: "Item cannot be modified while rented"
      });
    }

    // 4️⃣ update allowed
    Object.assign(item, req.body);
    await item.save();

    res.json({ message: "Item updated successfully", item });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE ITEM
 * Only owner can delete
 * Item must NOT be currently rented
 */
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not item owner" });
    }

    const activeRental = await Rental.findOne({
      item: item._id,
      status: { $in: ["requested", "approved", "active"] }
    });

    if (activeRental) {
      return res.status(403).json({
        message: "Item cannot be deleted while rented"
      });
    }

    await item.deleteOne();

    res.json({ message: "Item deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
