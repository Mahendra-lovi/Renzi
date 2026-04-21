const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Item = require("../models/Item");
const Rental = require("../models/Rental");
const Agreement = require("../models/Agreement");
const CaseFile = require("../models/CaseFile");

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clampTrust = (value) => Math.max(0, Math.min(100, value));

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit))
});

const applyTrustDelta = async (userId, delta) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.trustScore = clampTrust((user.trustScore || 50) + delta);
  await user.save();
};

// Approve user
router.patch("/approve/:id", auth, role(["admin"]), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { verified: true });
  res.json({ message: "User approved" });
});

// Block user
router.patch("/block/:id", auth, role(["admin"]), async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.blocked = !user.blocked;
  await user.save();

  res.json({
    message: user.blocked ? "User blocked" : "User unblocked",
    blocked: user.blocked
  });
});

router.get("/users", auth, role(["admin"]), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = String(req.query.q || "").trim();

  const filter = {};
  if (q) {
    const queryRegex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: queryRegex }, { email: queryRegex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({ data: users, pagination: buildPagination({ page, limit, total }) });
});

router.get("/items", auth, role(["admin"]), async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const q = String(req.query.q || "").trim();

  const filter = {};
  if (q) {
    const queryRegex = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: queryRegex }, { category: queryRegex }];
  }

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Item.countDocuments(filter)
  ]);

  res.json({ data: items, pagination: buildPagination({ page, limit, total }) });
});

router.delete("/items/:id", auth, role(["admin"]), async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  await Promise.all([
    item.deleteOne(),
    Rental.deleteMany({ item: item._id }),
    Agreement.deleteMany({ item: item._id }),
    CaseFile.deleteMany({ item: item._id })
  ]);

  res.json({ message: "Item deleted by admin" });
});

router.get("/rentals", auth, role(["admin"]), async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();

  const baseFilter = {};
  if (status) baseFilter.status = status;

  const rentals = await Rental.find(baseFilter)
    .populate("item", "title")
    .populate("owner", "email")
    .populate("renter", "email")
    .sort({ createdAt: -1 });

  const filtered = q
    ? rentals.filter((rental) => {
        const searchable = [
          rental.item?.title,
          rental.owner?.email,
          rental.renter?.email,
          rental.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      })
    : rentals;

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({ data, pagination: buildPagination({ page, limit, total }) });
});

router.patch("/rentals/:id/resolve-dispute", auth, role(["admin"]), async (req, res) => {
  const { outcome = "no_fault", note = "" } = req.body;

  if (!["owner_fault", "renter_fault", "no_fault"].includes(outcome)) {
    return res.status(400).json({ message: "Invalid dispute outcome" });
  }

  const rental = await Rental.findById(req.params.id);
  if (!rental) {
    return res.status(404).json({ message: "Rental not found" });
  }

  if (rental.status !== "disputed") {
    return res.status(400).json({ message: "Only disputed rentals can be resolved" });
  }

  rental.disputeResolution = outcome;
  rental.disputeNote = String(note || "").trim();
  rental.disputeResolvedAt = new Date();
  rental.status = "returned";
  await rental.save();

  await CaseFile.findOneAndUpdate(
    { rental: rental._id },
    {
      status: "closed",
      resolutionNote: String(note || "").trim(),
      closedAt: new Date()
    }
  );

  if (outcome === "owner_fault") {
    await applyTrustDelta(rental.owner, -5);
    await applyTrustDelta(rental.renter, 2);
  }

  if (outcome === "renter_fault") {
    await applyTrustDelta(rental.renter, -5);
    await applyTrustDelta(rental.owner, 2);
  }

  if (outcome === "no_fault") {
    await Promise.all([
      applyTrustDelta(rental.owner, 1),
      applyTrustDelta(rental.renter, 1)
    ]);
  }

  res.json({ message: "Dispute resolved", rental });
});

router.get("/cases", auth, role(["admin"]), async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();

  const filter = {};
  if (status) filter.status = status;

  const cases = await CaseFile.find(filter)
    .populate("item", "title")
    .populate("owner", "email")
    .populate("renter", "email")
    .populate("agreement", "status ownerSigned renterSigned")
    .sort({ createdAt: -1 });

  const filtered = q
    ? cases.filter((caseItem) => {
        const searchable = [
          caseItem.item?.title,
          caseItem.owner?.email,
          caseItem.renter?.email,
          caseItem.incidentType,
          caseItem.status,
          caseItem.incidentDescription
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      })
    : cases;

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  res.json({ data, pagination: buildPagination({ page, limit, total }) });
});

router.patch("/cases/:id/status", auth, role(["admin"]), async (req, res) => {
  const { status, resolutionNote = "" } = req.body;
  if (!["open", "under_review", "escalated", "closed"].includes(status)) {
    return res.status(400).json({ message: "Invalid case status" });
  }

  const caseFile = await CaseFile.findById(req.params.id);
  if (!caseFile) {
    return res.status(404).json({ message: "Case file not found" });
  }

  caseFile.status = status;
  caseFile.resolutionNote = String(resolutionNote || "").trim();
  caseFile.closedAt = status === "closed" ? new Date() : null;
  await caseFile.save();

  res.json({ message: "Case status updated", caseFile });
});

router.get("/overview", auth, role(["admin"]), async (req, res) => {
  const [
    totalUsers,
    totalItems,
    totalRentals,
    activeRentals,
    disputedRentals,
    openCases,
    revenueAgg
  ] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Rental.countDocuments(),
    Rental.countDocuments({ status: "active" }),
    Rental.countDocuments({ status: "disputed" }),
    CaseFile.countDocuments({ status: { $in: ["open", "under_review", "escalated"] } }),
    Rental.aggregate([
      { $match: { status: { $in: ["active", "returned"] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ])
  ]);

  res.json({
    totalUsers,
    totalItems,
    totalRentals,
    activeRentals,
    disputedRentals,
    openCases,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0
  });
});

router.get("/search", auth, role(["admin"]), async (req, res) => {
  const q = String(req.query.q || "").trim();
  const queryRegex = new RegExp(escapeRegex(q), "i");

  const users = await User.find({
    name: queryRegex
  }).select("-password");

  res.json(users);
});
module.exports = router;
