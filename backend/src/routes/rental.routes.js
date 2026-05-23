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
  getRentalAgreementPdf,
  getRentalChat,
  sendRentalChatMessage,
  signOwnerAgreement,
  signRenterAgreement,
  payAdvance,
  createGatewayOrder,
  verifyGatewayPayment,
  confirmAdvanceCash,
  payFinalSettlement,
  confirmFinalCash,
  getPaymentHistory,
  cancelRental,
  disputeRental,
  reportIssue
} = require("../controllers/rental.controller");

router.get("/my-rentals", auth, getMyRentals);
router.get("/owner-rentals", auth, getOwnerRentals);

router.post("/request", auth, requestRental);
router.patch("/approve/:id", auth, approveRental);
router.patch("/activate/:id", auth, activateRental);
router.patch("/return/:id", auth, returnRental);
router.patch("/:id/pay-advance", auth, payAdvance);
router.post("/:id/payment-gateway/order", auth, createGatewayOrder);
router.post("/:id/payment-gateway/verify", auth, verifyGatewayPayment);
router.patch("/:id/confirm-advance-cash", auth, confirmAdvanceCash);
router.patch("/:id/pay-final", auth, payFinalSettlement);
router.patch("/:id/confirm-final-cash", auth, confirmFinalCash);
router.get("/:id/payment-history", auth, getPaymentHistory);
router.patch("/cancel/:id", auth, cancelRental);
router.patch("/dispute/:id", auth, disputeRental);
router.patch("/report-issue/:id", auth, reportIssue);
router.get("/:id/agreement", auth, getRentalAgreement);
router.get("/:id/agreement/pdf", auth, getRentalAgreementPdf);
router.get("/:id/chat", auth, getRentalChat);
router.post("/:id/chat", auth, sendRentalChatMessage);
router.patch("/:id/sign-owner", auth, signOwnerAgreement);
router.patch("/:id/sign-renter", auth, signRenterAgreement);

module.exports = router;
