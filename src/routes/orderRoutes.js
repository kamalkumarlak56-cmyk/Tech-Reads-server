const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createOrder,
  myOrders,
  allOrders,
  markPaymentPaid,
  markDelivered
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/razorpay/create-order", protect, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifyRazorpayPayment);
router.post("/", protect, createOrder);
router.get("/my-orders", protect, myOrders);
router.get("/", protect, adminOnly, allOrders);
router.patch("/:id/payment", protect, adminOnly, markPaymentPaid);
router.patch("/:id/deliver", protect, adminOnly, markDelivered);

module.exports = router;
