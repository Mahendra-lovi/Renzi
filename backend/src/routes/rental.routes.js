const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  requestRental,
  approveRental,
  activateRental,
  returnRental,
  getMyRentals,
  getOwnerRentals,
  getRentalAgreement,
  signOwnerAgreement,
  signRenterAgreement,
  cancelRental,
  disputeRental
} = require("../controllers/rental.controller");

router.get("/my-rentals", auth, getMyRentals);
router.get("/owner-rentals", auth, getOwnerRentals);

router.post("/request", auth, requestRental);
router.patch("/approve/:id", auth, approveRental);
router.patch("/activate/:id", auth, activateRental);
router.patch("/return/:id", auth, returnRental);
router.patch("/cancel/:id", auth, cancelRental);
router.patch("/dispute/:id", auth, disputeRental);
router.get("/:id/agreement", auth, getRentalAgreement);
router.patch("/:id/sign-owner", auth, signOwnerAgreement);
router.patch("/:id/sign-renter", auth, signRenterAgreement);

module.exports = router;
