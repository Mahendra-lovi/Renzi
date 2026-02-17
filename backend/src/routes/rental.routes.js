const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  requestRental,
  approveRental,
  activateRental,
  returnRental,
  getMyRentals,
  getOwnerRentals 
} = require("../controllers/rental.controller");

router.get("/my-rentals", auth, getMyRentals);
router.get("/owner-rentals", auth, getOwnerRentals);

router.post("/request", auth, requestRental);
router.patch("/approve/:id", auth, approveRental);
router.patch("/activate/:id", auth, activateRental);
router.patch("/return/:id", auth, returnRental);

module.exports = router;
