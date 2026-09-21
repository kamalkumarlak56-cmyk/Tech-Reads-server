const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");

const createOrder = asyncHandler(async (req, res) => {
  const { items, customerName, shippingEmail, phone, address, city, postalCode, paymentMethod = "online" } = req.body;

  if (!items || !items.length) {
    res.status(400);
    throw new Error("Order must contain at least one item");
  }

  if (!["cod", "upi", "online"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Choose COD, UPI, or online payment");
  }

  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });

  const orderItems = items.map((item) => {
    const product = products.find((candidate) => candidate._id.toString() === item.product);
    if (!product) throw new Error("Product not found in order");

    return {
      product: product._id,
      title: product.title,
      image: product.image,
      price: product.price,
      quantity: item.quantity || 1
    };
  });

  const totalPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const isPaidOnline = paymentMethod === "upi" || paymentMethod === "online";
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalPrice,
    customerName,
    shippingEmail,
    phone,
    address,
    city,
    postalCode,
    paymentMethod,
    status: isPaidOnline ? "paid" : "pending",
    paymentStatus: isPaidOnline ? "paid" : "pending",
    paidAt: isPaidOnline ? new Date() : undefined
  });

  res.status(201).json(order);
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

const allOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.json(orders);
});

const markPaymentPaid = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  if (!["cash", "upi", "online"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Choose cash, UPI, or online payment");
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

module.exports = { createOrder, myOrders, allOrders, markPaymentPaid, markDelivered };
