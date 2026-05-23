const Item = require("../models/Item");
const Rental = require("../models/Rental"); // we’ll create model soon
const User = require("../models/User");
const Conversation = require("../models/Conversation");

const MAX_CHAT_MESSAGES = 200;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTag = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");

const normalizeHashtag = (value = "") => {
  const cleaned = String(value || "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");

  if (!cleaned) return "";
  return `#${cleaned}`;
};

const extractHashtags = (value = "") => {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => normalizeHashtag(part))
    .filter(Boolean);
};

const isValidHttpUrl = (value = "") => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidImageSource = (value = "") => {
  if (isValidHttpUrl(value)) {
    return true;
  }

  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
};

const normalizeCity = (value = "") => String(value).trim().toLowerCase();

const formatConversationPayload = (conversation, viewerId) => {
  const messages = (conversation.messages || []).map((entry) => {
    const sender = entry.sender || {};
    return {
      _id: entry._id,
      message: entry.message,
      createdAt: entry.createdAt,
      sender: {
        _id: sender._id,
        name: sender.name || "",
        email: sender.email || "",
        profileImage: sender.profileImage || "",
        role: sender.role || "user"
      },
      isMine: sender._id ? sender._id.toString() === viewerId : false
    };
  });

  const owner = conversation.owner || {};
  const renter = conversation.renter || {};

  return {
    threadId: conversation._id,
    itemId: conversation.item,
    rentalId: conversation.rental || null,
    participants: {
      owner: {
        _id: owner._id,
        name: owner.name || "",
        email: owner.email || "",
        profileImage: owner.profileImage || "",
        role: owner.role || "user"
      },
      renter: {
        _id: renter._id,
        name: renter.name || "",
        email: renter.email || "",
        profileImage: renter.profileImage || "",
        role: renter.role || "user"
      }
    },
    messages
  };
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
    const rawTags = req.body.tags;
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

    if (images.length > 0 && images.some((url) => !isValidImageSource(url))) {
      return res.status(400).json({
        message: "All images must be valid http/https URLs or data:image base64 strings"
      });
    }

    const titleWords = title.split(/\s+/).filter(Boolean);
    const autoTags = Array.from(
      new Set(
        [...titleWords, category]
          .map(normalizeHashtag)
          .filter((tag) => tag.length >= 3)
      )
    ).slice(0, 10);

    const userTags = Array.isArray(rawTags)
      ? rawTags.map((tag) => normalizeHashtag(tag)).filter(Boolean)
      : extractHashtags(rawTags);

    const mergedTags = Array.from(new Set([...userTags, ...autoTags])).slice(0, 12);

    const owner = await User.findById(req.user.id).select("city location");

    const itemPayload = {
      title,
      description,
      category,
      pricePerDay,
      images,
      tags: mergedTags,
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
      .populate("owner", "name email")
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
  try {
    const filter = {};
    const city = String(req.query.city || "").trim();
    const availability = String(req.query.availability || "").trim().toLowerCase();

    if (city) {
      filter.city = new RegExp(`^${escapeRegex(city)}$`, "i");
    }

    if (availability === "available") {
      filter.isAvailable = true;
    } else if (availability === "unavailable") {
      filter.isAvailable = false;
    }

    const items = await Item.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ITEMS BY OWNER (public)
 * Lightweight payload for map popups and owner summary widgets.
 */
exports.getItemsByOwner = async (req, res) => {
  try {
    const ownerId = String(req.params.ownerId || "").trim();
    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const limitInput = Number(req.query.limit);
    const limit = Number.isFinite(limitInput)
      ? Math.max(1, Math.min(30, Math.floor(limitInput)))
      : 20;

    const availability = String(req.query.availability || "available").trim().toLowerCase();
    const city = String(req.query.city || "").trim();

    const filter = { owner: ownerId };
    if (availability === "available") {
      filter.isAvailable = true;
    } else if (availability === "unavailable") {
      filter.isAvailable = false;
    }

    if (city) {
      filter.city = new RegExp(`^${escapeRegex(normalizeCity(city))}$`, "i");
    }

    const items = await Item.find(filter)
      .select("title category images pricePerDay isAvailable city location owner")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getItemChatThread = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name email profileImage role");
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const ownerId = item.owner?._id?.toString();
    if (!ownerId) {
      return res.status(400).json({ message: "Item owner not found" });
    }

    if (ownerId === req.user.id) {
      return res.status(400).json({ message: "Owner cannot open this client-owner chat from item page" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        item: item._id,
        owner: ownerId,
        renter: req.user.id
      },
      {
        $setOnInsert: {
          item: item._id,
          owner: ownerId,
          renter: req.user.id,
          lastMessageAt: new Date()
        }
      },
      { upsert: true, new: true }
    )
      .populate("owner", "name email profileImage role")
      .populate("renter", "name email profileImage role")
      .populate("messages.sender", "name email profileImage role");

    conversation.renterLastSeenAt = new Date();
    await conversation.save();

    res.json(formatConversationPayload(conversation, req.user.id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendItemChatMessage = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name email profileImage role");
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const ownerId = item.owner?._id?.toString();
    if (!ownerId) {
      return res.status(400).json({ message: "Item owner not found" });
    }

    if (ownerId === req.user.id) {
      return res.status(400).json({ message: "Owner cannot send client-owner chat from item page" });
    }

    const messageText = String(req.body?.message || "").trim();
    if (!messageText) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (messageText.length > 1000) {
      return res.status(400).json({ message: "Message must be under 1000 characters" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        item: item._id,
        owner: ownerId,
        renter: req.user.id
      },
      {
        $setOnInsert: {
          item: item._id,
          owner: ownerId,
          renter: req.user.id,
          lastMessageAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    conversation.messages.push({
      sender: req.user.id,
      message: messageText,
      createdAt: new Date()
    });

    if (conversation.messages.length > MAX_CHAT_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_CHAT_MESSAGES);
    }

    conversation.lastMessageAt = new Date();
    conversation.renterLastSeenAt = new Date();
    await conversation.save();

    const hydrated = await Conversation.findById(conversation._id)
      .populate("owner", "name email profileImage role")
      .populate("renter", "name email profileImage role")
      .populate("messages.sender", "name email profileImage role");

    res.status(201).json({
      message: "Chat message sent",
      chat: formatConversationPayload(hydrated, req.user.id)
    });
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
    const nextPayload = { ...req.body };

    if (Object.prototype.hasOwnProperty.call(nextPayload, "tags")) {
      const normalizedTags = Array.isArray(nextPayload.tags)
        ? nextPayload.tags.map((tag) => normalizeHashtag(tag)).filter(Boolean)
        : extractHashtags(nextPayload.tags);
      nextPayload.tags = Array.from(new Set(normalizedTags)).slice(0, 12);
    }

    Object.assign(item, nextPayload);
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
      const normalizedHashQuery = normalizeHashtag(trimmedQuery);
      const plainHashQuery = normalizedHashQuery.replace(/^#/, "");
      const queryRegex = new RegExp(escapeRegex(trimmedQuery.replace(/^#+/, "")), "i");
      const tagRegex = new RegExp(`^#?${escapeRegex(plainHashQuery)}`, "i");
      filter.$or = [
        { title: queryRegex },
        { description: queryRegex },
        { tags: tagRegex },
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
      .populate("owner", "name email")
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

    const plainQuery = query.replace(/^#+/, "");
    const suggestionRegex = new RegExp(escapeRegex(plainQuery), "i");

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

    const maybeAddSuggestion = (value, type = "default") => {
      if (!value) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      const formatted = type === "tag" ? normalizeHashtag(normalized) : normalized;
      if (!formatted) return;
      const dedupeKey = formatted.toLowerCase();
      if (seen.has(dedupeKey)) return;
      if (!suggestionRegex.test(formatted.replace(/^#/, ""))) return;

      seen.add(dedupeKey);
      suggestions.push(formatted);
    };

    matchedItems.forEach((item) => {
      maybeAddSuggestion(item.title, "default");
      maybeAddSuggestion(item.category, "default");
      (item.tags || []).forEach((tag) => maybeAddSuggestion(tag, "tag"));
    });

    res.json(suggestions.slice(0, 8));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


