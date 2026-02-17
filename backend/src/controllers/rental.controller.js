const Rental = require("../models/Rental");
const Item = require("../models/Item");

/**
 * REQUEST RENTAL
 * Any logged-in user (except owner) can request
 */
exports.requestRental = async (req, res) => {
  try {
    const { itemId, startDate, endDate } = req.body;

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
      totalPrice
    });

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

    res.json({
      message: "Rental approved",
      rental
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

    rental.status = "active";
    await rental.save();

    res.json({
      message: "Rental is now active",
      rental
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

    res.json({
      message: "Item returned successfully",
      rental
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

    res.json(rentals);
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

    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};