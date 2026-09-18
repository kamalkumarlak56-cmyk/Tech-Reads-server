const express = require("express");
const { createOrder, myOrders, allOrders } = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/my-orders", protect, myOrders);
router.get("/", protect, adminOnly, allOrders);

module.exports = router;
