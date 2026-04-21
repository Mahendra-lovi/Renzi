const Item = require("../models/Item");
const Rental = require("../models/Rental"); // we’ll create model soon
const User = require("../models/User");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTag = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");

const isValidHttpUrl = (value = "") => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * CREATE ITEM
 * Any logged-in user can create an item
 */
exports.createItem = async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const pricePerDay = Number(req.body.pricePerDay);
    const images = Array.isArray(req.body.images)
      ? req.body.images
          .map((url) => String(url || "").trim())
          .filter(Boolean)
      : [];
    const city = String(req.body.city || "").trim();
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    if (Number.isNaN(pricePerDay) || pricePerDay <= 0) {
      return res.status(400).json({ message: "Price per day must be greater than 0" });
    }

    if (images.length > 0 && images.some((url) => !isValidHttpUrl(url))) {
      return res.status(400).json({ message: "All images must be valid http/https URLs" });
    }

    const titleWords = title.split(/\s+/).filter(Boolean);
    const autoTags = Array.from(
      new Set(
        [...titleWords, category]
          .map(normalizeTag)
          .filter((tag) => tag.length >= 3)
      )
    ).slice(0, 10);

    const owner = await User.findById(req.user.id).select("city location");

    const itemPayload = {
      title,
      description,
      category,
      pricePerDay,
      images,
      tags: autoTags,
      owner: req.user.id
    };

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      itemPayload.location = {
        type: "Point",
        coordinates: [lng, lat]
      };
    } else if (owner?.location?.coordinates?.length === 2) {
      itemPayload.location = owner.location;
    }

    if (city) {
      itemPayload.city = city;
    } else if (owner?.city) {
      itemPayload.city = owner.city;
    }

    const item = await Item.create(itemPayload);

    res.status(201).json(item);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getNearbyItems = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm) || 10;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Valid lat and lng are required" });
    }

    const items = await Item.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000
        }
      }
    })
      .populate("owner", "email")
      .limit(30);

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL ITEMS (public)
 */
exports.getAllItems = async (req, res) => {
  const items = await Item.find().populate("owner", "email");
  res.json(items);
};

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET MY ITEMS
exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.id });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

/**
 * SEARCH ITEMS (public)
 * Supports text query + category + min/max price filters.
 */
exports.searchItems = async (req, res) => {
  try {
    const {
      q = "",
      category = "",
      minPrice,
      maxPrice,
      availability = ""
    } = req.query;
    const filter = {};

    const trimmedQuery = q.trim();
    if (trimmedQuery) {
      const queryRegex = new RegExp(escapeRegex(trimmedQuery), "i");
      filter.$or = [
        { title: queryRegex },
        { description: queryRegex },
        { tags: queryRegex }
      ];
    }

    const trimmedCategory = category.trim();
    if (trimmedCategory) {
      filter.category = new RegExp(`^${escapeRegex(trimmedCategory)}$`, "i");
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);

    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      filter.pricePerDay = {};
      if (!Number.isNaN(min)) filter.pricePerDay.$gte = min;
      if (!Number.isNaN(max)) filter.pricePerDay.$lte = max;
    }

    if (availability === "available") {
      filter.isAvailable = true;
    } else if (availability === "unavailable") {
      filter.isAvailable = false;
    }

    const items = await Item.find(filter)
      .populate("owner", "email")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * SEARCH SUGGESTIONS (public)
 * Returns lightweight autocomplete suggestions from title/category/tags.
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.json([]);
    }

    const suggestionRegex = new RegExp(escapeRegex(query), "i");

    const matchedItems = await Item.find({
      $or: [
        { title: suggestionRegex },
        { category: suggestionRegex },
        { tags: suggestionRegex }
      ]
    })
      .select("title category tags")
      .limit(20)
      .lean();

    const suggestions = [];
    const seen = new Set();

    const maybeAddSuggestion = (value) => {
      if (!value) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) return;
      if (!suggestionRegex.test(normalized)) return;

      seen.add(dedupeKey);
      suggestions.push(normalized);
    };

    matchedItems.forEach((item) => {
      maybeAddSuggestion(item.title);
      maybeAddSuggestion(item.category);
      (item.tags || []).forEach(maybeAddSuggestion);
    });

    res.json(suggestions.slice(0, 8));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


