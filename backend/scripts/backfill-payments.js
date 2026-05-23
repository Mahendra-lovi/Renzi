require("dotenv").config();
const mongoose = require("mongoose");
const Rental = require("../src/models/Rental");

const ADVANCE_PAYMENT_RATIO = 0.25;

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calculatePaymentBreakdown = (totalPrice) => {
  const safeTotal = roundCurrency(Number(totalPrice) || 0);
  const advanceAmount = roundCurrency(safeTotal * ADVANCE_PAYMENT_RATIO);
  const finalAmount = roundCurrency(safeTotal - advanceAmount);
  return { advanceAmount, finalAmount };
};

const buildPaymentDefaults = (rental) => {
  const { advanceAmount, finalAmount } = calculatePaymentBreakdown(rental.totalPrice);

  const finalDefaultStatus = ["returned", "disputed"].includes(rental.status)
    ? "pending"
    : "not_due";

  return {
    advanceAmount,
    finalAmount,
    advance: {
      status: "pending",
      method: "none",
      transactionRef: "",
      paidAt: null,
      confirmedAt: null,
      confirmedBy: null,
      gatewayOrderId: "",
      gatewayPaymentId: "",
      gatewaySignature: ""
    },
    final: {
      status: finalDefaultStatus,
      method: "none",
      transactionRef: "",
      paidAt: null,
      confirmedAt: null,
      confirmedBy: null,
      gatewayOrderId: "",
      gatewayPaymentId: "",
      gatewaySignature: ""
    },
    receipts: [],
    timeline: []
  };
};

const hydratePayment = (rental) => {
  const defaults = buildPaymentDefaults(rental);
  const payment = rental.payment || {};
  const advance = payment.advance || {};
  const final = payment.final || {};

  return {
    advanceAmount: typeof payment.advanceAmount === "number" ? payment.advanceAmount : defaults.advanceAmount,
    finalAmount: typeof payment.finalAmount === "number" ? payment.finalAmount : defaults.finalAmount,
    advance: {
      status: advance.status || defaults.advance.status,
      method: advance.method || defaults.advance.method,
      transactionRef: advance.transactionRef || "",
      paidAt: advance.paidAt || null,
      confirmedAt: advance.confirmedAt || null,
      confirmedBy: advance.confirmedBy || null,
      gatewayOrderId: advance.gatewayOrderId || "",
      gatewayPaymentId: advance.gatewayPaymentId || "",
      gatewaySignature: advance.gatewaySignature || ""
    },
    final: {
      status: final.status || defaults.final.status,
      method: final.method || defaults.final.method,
      transactionRef: final.transactionRef || "",
      paidAt: final.paidAt || null,
      confirmedAt: final.confirmedAt || null,
      confirmedBy: final.confirmedBy || null,
      gatewayOrderId: final.gatewayOrderId || "",
      gatewayPaymentId: final.gatewayPaymentId || "",
      gatewaySignature: final.gatewaySignature || ""
    },
    receipts: Array.isArray(payment.receipts) ? payment.receipts : [],
    timeline: Array.isArray(payment.timeline) ? payment.timeline : []
  };
};

const hasDiff = (before = {}, after = {}) => JSON.stringify(before) !== JSON.stringify(after);

const run = async () => {
  const shouldApply = process.argv.includes("--apply");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const query = {};
  const cursor = limit && Number.isFinite(limit)
    ? Rental.find(query).limit(limit)
    : Rental.find(query);

  const rentals = await cursor;
  let scanned = 0;
  let changed = 0;

  for (const rental of rentals) {
    scanned += 1;
    const nextPayment = hydratePayment(rental);
    if (!hasDiff(rental.payment, nextPayment)) {
      continue;
    }

    changed += 1;
    if (shouldApply) {
      rental.payment = nextPayment;
      await rental.save();
    }
  }

  console.log(`Scanned: ${scanned}`);
  console.log(`Needs update: ${changed}`);
  console.log(`Mode: ${shouldApply ? "apply" : "dry-run"}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Backfill failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
