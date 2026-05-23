const Rental = require("../models/Rental");
const Item = require("../models/Item");
const User = require("../models/User");
const Agreement = require("../models/Agreement");
const CaseFile = require("../models/CaseFile");
const Conversation = require("../models/Conversation");
const PDFDocument = require("pdfkit");

const TRUST_MIN = 0;
const TRUST_MAX = 100;
const MAX_CHAT_MESSAGES = 200;

const clampTrust = (value) => Math.max(TRUST_MIN, Math.min(TRUST_MAX, value));

const updateTrustScore = async (userId, delta) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.trustScore = clampTrust((user.trustScore || 50) + delta);
  await user.save();
};

const buildAgreementContent = ({ rental, item, owner, renter }) => {
  const start = new Date(rental.startDate).toDateString();
  const end = new Date(rental.endDate).toDateString();

  return [
    `Rental Agreement for ${item.title}`,
    `Owner: ${owner.email}`,
    `Renter: ${renter.email}`,
    `Rental period: ${start} to ${end}`,
    `Total price: INR ${rental.totalPrice}`,
    "Both parties agree to return the item in expected condition and follow marketplace rules."
  ].join("\n");
};

const createAgreementForRental = async (rental) => {
  const existing = await Agreement.findOne({ rental: rental._id });
  if (existing) return existing;

  const [item, owner, renter] = await Promise.all([
    Item.findById(rental.item).select("title"),
    User.findById(rental.owner).select("email"),
    User.findById(rental.renter).select("email")
  ]);

  const agreement = await Agreement.create({
    rental: rental._id,
    renter: rental.renter,
    owner: rental.owner,
    item: rental.item,
    startDate: rental.startDate,
    endDate: rental.endDate,
    totalPrice: rental.totalPrice,
    content: buildAgreementContent({ rental, item, owner, renter })
  });

  return agreement;
};

const attachAgreementInfo = async (rentals) => {
  const rentalIds = rentals.map((rental) => rental._id);
  const agreements = await Agreement.find({ rental: { $in: rentalIds } })
    .select("rental ownerSigned renterSigned status")
    .lean();

  const agreementByRentalId = new Map(
    agreements.map((agreement) => [String(agreement.rental), agreement])
  );

  return rentals.map((rental) => {
    const rentalObject = rental.toObject();
    rentalObject.agreement = agreementByRentalId.get(String(rental._id)) || null;
    return rentalObject;
  });
};

const getAuthorizedRentalAgreement = async (rentalId, userId) => {
  const rental = await Rental.findById(rentalId);
  if (!rental) {
    return { status: 404, message: "Rental not found" };
  }

  if (
    rental.owner.toString() !== userId &&
    rental.renter.toString() !== userId
  ) {
    return { status: 403, message: "Not allowed to view this agreement" };
  }

  const agreement = await Agreement.findOne({ rental: rental._id })
    .populate("item", "title")
    .populate("owner", "name email")
    .populate("renter", "name email")
    .lean();

  if (!agreement) {
    return { status: 404, message: "Agreement not found" };
  }

  return { rental, agreement };
};

const createCaseFileForDispute = async ({
  rental,
  raisedBy,
  incidentType,
  incidentDescription,
  severity
}) => {
  const existingCase = await CaseFile.findOne({ rental: rental._id });
  if (existingCase) return existingCase;

  const agreement = await Agreement.findOne({ rental: rental._id });

  return CaseFile.create({
    rental: rental._id,
    agreement: agreement?._id || null,
    item: rental.item,
    owner: rental.owner,
    renter: rental.renter,
    raisedBy,
    incidentType: incidentType || "other",
    incidentDescription: String(incidentDescription || "").trim(),
    severity: severity || "medium",
    agreementSnapshot: agreement?.content || "",
    legalIntentAcknowledged: true,
    status: "open"
  });
};

const getAuthorizedRentalParticipant = async (rentalId, userId) => {
  const rental = await Rental.findById(rentalId);
  if (!rental) {
    return { status: 404, message: "Rental not found" };
  }

  const isOwner = rental.owner.toString() === userId;
  const isRenter = rental.renter.toString() === userId;

  if (!isOwner && !isRenter) {
    return { status: 403, message: "Not allowed to access this rental chat" };
  }

  return { rental, isOwner, isRenter };
};

const resolveConversationForRental = async (rental) => {
  let conversation = await Conversation.findOne({
    item: rental.item,
    owner: rental.owner,
    renter: rental.renter
  });

  if (!conversation) {
    conversation = await Conversation.create({
      item: rental.item,
      owner: rental.owner,
      renter: rental.renter,
      rental: rental._id,
      messages: [],
      lastMessageAt: new Date()
    });
  }

  if (!conversation.rental) {
    conversation.rental = rental._id;
  }

  if (
    conversation.messages.length === 0 &&
    Array.isArray(rental.chatMessages) &&
    rental.chatMessages.length > 0
  ) {
    conversation.messages = rental.chatMessages
      .slice(-MAX_CHAT_MESSAGES)
      .map((entry) => ({
        sender: entry.sender,
        message: entry.message,
        createdAt: entry.createdAt || new Date()
      }));
    conversation.lastMessageAt = conversation.messages[conversation.messages.length - 1]?.createdAt || new Date();
  }

  await conversation.save();

  return conversation;
};

const formatChatPayload = (conversation, viewerId) => {
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
    rentalId: conversation.rental || null,
    itemId: conversation.item,
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

const markConversationSeenByUser = (conversation, userId) => {
  if (String(conversation.owner) === String(userId)) {
    conversation.ownerLastSeenAt = new Date();
  }
  if (String(conversation.renter) === String(userId)) {
    conversation.renterLastSeenAt = new Date();
  }
};

/**
 * REQUEST RENTAL
 * Any logged-in user (except owner) can request
 */
exports.requestRental = async (req, res) => {
  try {
    const {
      itemId,
      startDate,
      endDate,
      purpose = "",
      pickupPreference = "pickup",
      notes = "",
      signatureName = "",
      agreementAccepted = false
    } = req.body;

    // 1️⃣ item exists?
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 2️⃣ owner cannot rent own item
    if (item.owner.toString() === req.user.id) {
      return res.status(403).json({ message: "Owner cannot rent own item" });
    }

    // 3️⃣ check active rental
    const existingRental = await Rental.findOne({
      item: itemId,
      status: { $in: ["requested", "approved", "active"] }
    });

    if (existingRental) {
      return res.status(403).json({
        message: "Item is already rented or requested"
      });
    }

    // 4️⃣ calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffTime = end - start;
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) {
      return res.status(400).json({ message: "Invalid rental dates" });
    }

    // 5️⃣ calculate total price 🔐
    const totalPrice = totalDays * item.pricePerDay;

    // 6️⃣ create rental
    const rental = await Rental.create({
      item: item._id,
      owner: item.owner,
      renter: req.user.id,
      startDate,
      endDate,
      totalPrice,
      purpose: String(purpose || "").trim(),
      pickupPreference: ["pickup", "delivery", "flexible"].includes(pickupPreference)
        ? pickupPreference
        : "pickup",
      notes: String(notes || "").trim(),
      signatureName: String(signatureName || "").trim(),
      agreementAcceptedAt: agreementAccepted ? new Date() : null
    });

    await Conversation.findOneAndUpdate(
      {
        item: item._id,
        owner: item.owner,
        renter: req.user.id
      },
      {
        $setOnInsert: {
          item: item._id,
          owner: item.owner,
          renter: req.user.id,
          lastMessageAt: new Date()
        },
        $set: {
          rental: rental._id
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: "Rental request sent",
      rental
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * APPROVE RENTAL
 * Only item owner can approve
 */
exports.approveRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    // 1️⃣ rental exists?
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // 2️⃣ only owner can approve
    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can approve rental" });
    }

    // 3️⃣ status must be requested
    if (rental.status !== "requested") {
      return res.status(400).json({
        message: "Rental cannot be approved in current state"
      });
    }

    // 4️⃣ approve rental
    rental.status = "approved";
    await rental.save();

    const agreement = await createAgreementForRental(rental);

    res.json({
      message: "Rental approved",
      rental,
      agreement
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * ACTIVATE RENTAL
 * Only owner can activate
 */
exports.activateRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can activate rental" });
    }

    if (rental.status !== "approved") {
      return res.status(400).json({
        message: "Rental cannot be activated in current state"
      });
    }

    const agreement = await Agreement.findOne({ rental: rental._id });
    if (!agreement) {
      return res.status(400).json({
        message: "Agreement not found for this rental"
      });
    }

    if (!agreement.ownerSigned || !agreement.renterSigned) {
      return res.status(403).json({
        message: "Both owner and renter must sign the agreement before activation"
      });
    }

    rental.status = "active";
    await rental.save();

    agreement.status = "active";
    await agreement.save();

    res.json({
      message: "Rental is now active",
      rental,
      agreement
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/**
 * RETURN ITEM
 * Only renter can return
 */
exports.returnRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only renter can return item" });
    }

    if (rental.status !== "active") {
      return res.status(400).json({
        message: "Rental cannot be returned in current state"
      });
    }

    rental.status = "returned";
    await rental.save();

    const agreement = await Agreement.findOne({ rental: rental._id });
    if (agreement) {
      agreement.status = "completed";
      await agreement.save();
    }

    await Promise.all([
      updateTrustScore(rental.renter, 5),
      updateTrustScore(rental.owner, 3)
    ]);

    res.json({
      message: "Item returned successfully",
      rental,
      agreement
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET RENTALS OF LOGGED-IN USER (Renter side)
exports.getMyRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ renter: req.user.id })
      .populate("item", "title images pricePerDay")
      .sort({ createdAt: -1 });

    const rentalsWithAgreement = await attachAgreementInfo(rentals);
    res.json(rentalsWithAgreement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET RENTALS FOR OWNER (requests on my items)
exports.getOwnerRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ owner: req.user.id })
      .populate("item", "title images pricePerDay")
      .populate("renter", "email")
      .sort({ createdAt: -1 });

    const rentalsWithAgreement = await attachAgreementInfo(rentals);
    res.json(rentalsWithAgreement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRentalAgreement = async (req, res) => {
  try {
    const result = await getAuthorizedRentalAgreement(req.params.id, req.user.id);
    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json(result.agreement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRentalAgreementPdf = async (req, res) => {
  try {
    const result = await getAuthorizedRentalAgreement(req.params.id, req.user.id);
    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    const { rental, agreement } = result;

    const ownerName = agreement.owner?.name || agreement.owner?.email || "Owner";
    const ownerEmail = agreement.owner?.email || "N/A";
    const renterName = agreement.renter?.name || agreement.renter?.email || "Renter";
    const renterEmail = agreement.renter?.email || "N/A";
    const itemTitle = agreement.item?.title || "Rental Item";
    const generatedAt = new Date();

    const filename = `Renzi-Agreement-${String(rental._id)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text("RENZI RENTAL AGREEMENT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666").text(`Document ID: ${agreement._id}`, { align: "center" });
    doc.text(`Generated: ${generatedAt.toISOString()}`, { align: "center" });
    doc.fillColor("#000");
    doc.moveDown();

    doc.fontSize(12).text("Agreement Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Item: ${itemTitle}`);
    doc.text(`Rental ID: ${rental._id}`);
    doc.text(`Agreement Status: ${agreement.status}`);
    doc.text(`Rental Period: ${new Date(agreement.startDate).toDateString()} to ${new Date(agreement.endDate).toDateString()}`);
    doc.text(`Total Price: INR ${agreement.totalPrice}`);
    doc.moveDown();

    doc.fontSize(12).text("Parties", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Owner: ${ownerName} (${ownerEmail})`);
    doc.text(`Renter: ${renterName} (${renterEmail})`);
    doc.moveDown();

    doc.fontSize(12).text("Terms", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(agreement.content || "No terms found.");
    doc.moveDown();

    doc.fontSize(12).text("Digital Signatures", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Owner Signed: ${agreement.ownerSigned ? "Yes" : "No"}`);
    if (agreement.ownerSignedAt) {
      doc.text(`Owner Signed At: ${new Date(agreement.ownerSignedAt).toISOString()}`);
    }
    doc.text(`Renter Signed: ${agreement.renterSigned ? "Yes" : "No"}`);
    if (agreement.renterSignedAt) {
      doc.text(`Renter Signed At: ${new Date(agreement.renterSignedAt).toISOString()}`);
    }
    if (rental.signatureName) {
      doc.text(`Booking Request Signature Name: ${rental.signatureName}`);
    }

    doc.moveDown();
    doc.fontSize(9).fillColor("#666").text(
      "This document is generated from Renzi records for reference during dispute/legal review. Please verify all details against platform audit logs.",
      { align: "left" }
    );

    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

exports.getRentalChat = async (req, res) => {
  try {
    const access = await getAuthorizedRentalParticipant(req.params.id, req.user.id);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    const baseConversation = await resolveConversationForRental(access.rental);
    markConversationSeenByUser(baseConversation, req.user.id);
    await baseConversation.save();

    const conversation = await Conversation.findById(baseConversation._id)
      .populate("owner", "name email profileImage role")
      .populate("renter", "name email profileImage role")
      .populate("messages.sender", "name email profileImage role");

    res.json(formatChatPayload(conversation, req.user.id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendRentalChatMessage = async (req, res) => {
  try {
    const access = await getAuthorizedRentalParticipant(req.params.id, req.user.id);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    const messageText = String(req.body?.message || "").trim();
    if (!messageText) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (messageText.length > 1000) {
      return res.status(400).json({ message: "Message must be under 1000 characters" });
    }

    const conversation = await resolveConversationForRental(access.rental);

    conversation.messages.push({
      sender: req.user.id,
      message: messageText,
      createdAt: new Date()
    });

    if (conversation.messages.length > MAX_CHAT_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_CHAT_MESSAGES);
    }

    conversation.lastMessageAt = new Date();
    markConversationSeenByUser(conversation, req.user.id);
    await conversation.save();

    const hydrated = await Conversation.findById(conversation._id)
      .populate("owner", "name email profileImage role")
      .populate("renter", "name email profileImage role")
      .populate("messages.sender", "name email profileImage role");

    res.status(201).json({
      message: "Chat message sent",
      chat: formatChatPayload(hydrated, req.user.id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.signOwnerAgreement = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can sign as owner" });
    }

    const agreement = await Agreement.findOne({ rental: rental._id });
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    agreement.ownerSigned = true;
    agreement.ownerSignedAt = new Date();
    if (agreement.ownerSigned && agreement.renterSigned) {
      agreement.status = "active";
    }
    await agreement.save();

    res.json({ message: "Owner signed agreement", agreement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.signRenterAgreement = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only renter can sign as renter" });
    }

    const agreement = await Agreement.findOne({ rental: rental._id });
    if (!agreement) {
      return res.status(404).json({ message: "Agreement not found" });
    }

    agreement.renterSigned = true;
    agreement.renterSignedAt = new Date();
    if (agreement.ownerSigned && agreement.renterSigned) {
      agreement.status = "active";
    }
    await agreement.save();

    res.json({ message: "Renter signed agreement", agreement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelRental = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (rental.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only renter can cancel rental" });
    }

    if (!["requested", "approved"].includes(rental.status)) {
      return res.status(400).json({ message: "Only requested or approved rentals can be cancelled" });
    }

    rental.status = "cancelled";
    await rental.save();

    await updateTrustScore(rental.renter, -4);

    res.json({ message: "Rental cancelled", rental });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.disputeRental = async (req, res) => {
  try {
    const {
      incidentType = "other",
      incidentDescription = "Raised by marketplace participant",
      severity = "medium"
    } = req.body || {};

    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    if (
      rental.owner.toString() !== req.user.id &&
      rental.renter.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Only owner or renter can raise dispute" });
    }

    if (!["active", "approved"].includes(rental.status)) {
      return res.status(400).json({ message: "Only approved or active rentals can be disputed" });
    }

    rental.status = "disputed";
    rental.disputeResolution = "pending";
    rental.disputeNote = String(incidentDescription || "Raised by marketplace participant").trim();
    rental.disputeResolvedAt = null;
    await rental.save();

    const caseFile = await createCaseFileForDispute({
      rental,
      raisedBy: req.user.id,
      incidentType,
      incidentDescription,
      severity
    });

    await Promise.all([
      updateTrustScore(rental.renter, -3),
      updateTrustScore(rental.owner, -3)
    ]);

    res.json({
      message: "Rental marked as disputed and case file created",
      rental,
      caseFile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * REPORT ISSUE
 * Renter or owner can report an issue with the rental
 * Severe issues auto-escalate to admin review
 */
exports.reportIssue = async (req, res) => {
  try {
    const {
      incidentType = "other",
      incidentDescription = "",
      severity = "medium",
      ownerContacted = false
    } = req.body || {};

    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Only owner or renter can report
    if (
      rental.owner.toString() !== req.user.id &&
      rental.renter.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Only owner or renter can report an issue" });
    }

    // Can only report approved or active rentals
    if (!["active", "approved"].includes(rental.status)) {
      return res.status(400).json({
        message: "Can only report issues on approved or active rentals"
      });
    }

    // Check if issue is severe (auto-escalate to admin)
    const severeTypes = ["violent_behavior", "harassment", "payment_issue"];
    const severeSeverities = ["high", "critical"];
    const isSevere = severeTypes.includes(incidentType) || severeSeverities.includes(severity);

    // Update rental with issue metadata
    rental.status = "disputed";
    rental.issueStatus = isSevere ? "resolved" : "reported"; // Will be resolved once admin acts
    rental.issueSeverity = severity;
    rental.issueReportedAt = new Date();
    rental.issueReportedBy = req.user.id;
    rental.disputeResolution = "pending";
    rental.disputeNote = String(incidentDescription || "Issue reported by marketplace participant").trim();
    await rental.save();

    // Create or update case file
    let caseFile = await CaseFile.findOne({ rental: rental._id });

    if (!caseFile) {
      caseFile = await CaseFile.create({
        rental: rental._id,
        agreement: (await Agreement.findOne({ rental: rental._id }))?._id || null,
        item: rental.item,
        owner: rental.owner,
        renter: rental.renter,
        raisedBy: req.user.id,
        incidentType,
        incidentDescription: String(incidentDescription || "").trim(),
        severity,
        agreementSnapshot: (await Agreement.findOne({ rental: rental._id }))?.content || "",
        legalIntentAcknowledged: true,
        status: isSevere ? "escalated" : "open",
        autoEscalated: isSevere,
        escalationReason: isSevere
          ? `Auto-escalated: ${severeTypes.includes(incidentType) ? "issue type " + incidentType : "severity " + severity}`
          : "",
        escalatedAt: isSevere ? new Date() : null,
        ownerContactStatus: ownerContacted ? "confirmed" : "none",
        escalationStage: isSevere ? "admin_review" : "owner_first"
      });
    } else {
      // Update existing case file
      caseFile.incidentType = incidentType;
      caseFile.incidentDescription = String(incidentDescription || "").trim();
      caseFile.severity = severity;
      caseFile.raisedBy = req.user.id;
      caseFile.autoEscalated = isSevere;
      caseFile.escalationReason = isSevere
        ? `Auto-escalated: ${severeTypes.includes(incidentType) ? "issue type " + incidentType : "severity " + severity}`
        : "";
      caseFile.escalatedAt = isSevere ? new Date() : null;
      caseFile.status = isSevere ? "escalated" : "open";
      caseFile.ownerContactStatus = ownerContacted ? "confirmed" : "none";
      caseFile.escalationStage = isSevere ? "admin_review" : "owner_first";
      await caseFile.save();
    }

    // Apply trust score penalty (more severe = bigger penalty)
    let trustPenalty = -1; // low
    if (severity === "medium") trustPenalty = -2;
    if (severity === "high") trustPenalty = -3;
    if (severity === "critical") trustPenalty = -5;

    const reportedUser = req.user.id === rental.renter.toString() ? rental.owner : rental.renter;
    await updateTrustScore(reportedUser, trustPenalty);

    const responseMessage = isSevere
      ? "Issue reported and automatically escalated to admin review"
      : ownerContacted
      ? "Issue reported. Owner has been notified to respond."
      : "Issue report submitted. Please attempt to contact the owner first.";

    res.json({
      message: responseMessage,
      rental,
      caseFile,
      autoEscalated: isSevere
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};