const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (
    !keyId ||
    !keySecret ||
    keyId === "your_razorpay_key_id" ||
    keySecret === "your_razorpay_key_secret"
  ) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const validateAndBuildOrderItems = async (items, res) => {
  if (!items || !items.length) {
    res.status(400);
    throw new Error("Order must contain at least one item");
  }

  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });

  const orderItems = items.map((item) => {
    const product = products.find(
      (candidate) => candidate._id.toString() === String(item.product)
    );
    if (!product) {
      res.status(400);
      throw new Error("One or more products in your order were not found");
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);
    if (product.stock < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.title}" (${product.stock} available)`);
    }

    return {
      product: product._id,
      title: product.title,
      image: product.image,
      price: product.price,
      quantity
    };
  });

  const totalPrice =
    Math.round(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

  return { orderItems, totalPrice };
};

const deductStockForItems = async (orderItems) => {
  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, purchasedCount: item.quantity }
      })
    )
  );
};

// POST /api/orders/razorpay/create-order
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const { totalPrice } = await validateAndBuildOrderItems(items, res);
  const amountInPaise = Math.max(100, Math.round(totalPrice * 100));

  const razorpay = getRazorpayClient();
  if (razorpay) {
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
      });

      return res.json({
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID.trim(),
        mode: "live"
      });
    } catch (err) {
      res.status(502);
      throw new Error(
        err?.error?.description || "Could not initialize Razorpay order. Check your Razorpay keys."
      );
    }
  }

  // Fallback test simulation mode when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured yet
  return res.json({
    orderId: `order_rzp_${Date.now()}`,
    amount: amountInPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || "rzp_test_techreads",
    mode: "test_simulated"
  });
});

// POST /api/orders/razorpay/verify
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    mode,
    paymentFailed = false,
    items,
    customerName,
    shippingEmail,
    phone,
    address,
    city,
    postalCode,
    paymentMethod = "razorpay"
  } = req.body;

  if (!customerName?.trim() || !address?.trim()) {
    res.status(400);
    throw new Error("Customer name and delivery address are required");
  }

  const { orderItems, totalPrice } = await validateAndBuildOrderItems(items, res);

  if (paymentFailed) {
    const failedOrder = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalPrice,
      customerName: customerName.trim(),
      shippingEmail: shippingEmail?.trim() || req.user.email,
      phone: phone?.trim() || "",
      address: address.trim(),
      city: city?.trim() || "",
      postalCode: postalCode?.trim() || "",
      paymentMethod: "razorpay",
      status: "cancelled",
      paymentStatus: "failed",
      razorpayOrderId: razorpay_order_id || `order_rzp_${Date.now()}`,
      razorpayPaymentId: razorpay_payment_id || ""
    });
    return res.status(201).json(failedOrder);
  }

  if (!razorpay_order_id || !razorpay_payment_id) {
    res.status(400);
    throw new Error("Missing Razorpay payment details");
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (
    mode === "live" &&
    keySecret &&
    keySecret !== "your_razorpay_key_secret"
  ) {
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400);
      throw new Error("Razorpay payment signature verification failed");
    }
  }

  const validMethod = ["razorpay", "upi", "online"].includes(paymentMethod)
    ? paymentMethod
    : "razorpay";

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalPrice,
    customerName: customerName.trim(),
    shippingEmail: shippingEmail?.trim() || req.user.email,
    phone: phone?.trim() || "",
    address: address.trim(),
    city: city?.trim() || "",
    postalCode: postalCode?.trim() || "",
    paymentMethod: validMethod,
    status: "paid",
    paymentStatus: "paid",
    paidAt: new Date(),
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature || "verified_test_signature"
  });

  await deductStockForItems(orderItems);

  res.status(201).json(order);
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    customerName,
    shippingEmail,
    phone,
    address,
    city,
    postalCode,
    paymentMethod = "razorpay"
  } = req.body;

  if (!["cod", "upi", "online", "razorpay"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Choose Razorpay, UPI, online payment, or COD");
  }

  if (!customerName?.trim() || !address?.trim()) {
    res.status(400);
    throw new Error("Customer name and delivery address are required");
  }

  const { orderItems, totalPrice } = await validateAndBuildOrderItems(items, res);

  const isPaidOnline =
    paymentMethod === "upi" || paymentMethod === "online" || paymentMethod === "razorpay";
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalPrice,
    customerName: customerName.trim(),
    shippingEmail: shippingEmail?.trim() || req.user.email,
    phone: phone?.trim(),
    address: address.trim(),
    city: city?.trim() || "",
    postalCode: postalCode?.trim() || "",
    paymentMethod,
    status: isPaidOnline ? "paid" : "pending",
    paymentStatus: isPaidOnline ? "paid" : "pending",
    paidAt: isPaidOnline ? new Date() : undefined
  });

  await deductStockForItems(orderItems);

  res.status(201).json(order);
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json(orders);
});

const markPaymentPaid = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  if (!["cash", "upi", "online", "razorpay"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Choose cash, UPI, Razorpay, or online payment");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.paymentMethod = paymentMethod;
  order.paymentStatus = "paid";
  order.paidAt = new Date();
  if (order.status === "pending") order.status = "paid";
  await order.save();
  res.json(order);
});

const markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.status === "cancelled") {
    res.status(400);
    throw new Error("Cancelled orders cannot be delivered");
  }

  order.status = "delivered";
  order.deliveredAt = new Date();
  await order.save();
  res.json(order);
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createOrder,
  myOrders,
  allOrders,
  markPaymentPaid,
  markDelivered
};
