const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const {
  requestRental,
  approveRental,
  activateRental,
  returnRental
} = require("../controllers/rental.controller");

router.post("/request", auth, requestRental);
router.patch("/approve/:id", auth, approveRental);
router.patch("/activate/:id", auth, activateRental);
router.patch("/return/:id", auth, returnRental);

module.exports = router;
