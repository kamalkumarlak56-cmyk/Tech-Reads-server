const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");

const createOrder = asyncHandler(async (req, res) => {
  const { items, customerName, shippingEmail, phone, address, city, postalCode, paymentMethod = "demo" } = req.body;

  if (!items || !items.length) {
    res.status(400);
    throw new Error("Order must contain at least one item");
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
    status: paymentMethod === "demo" ? "paid" : "pending"
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

module.exports = { createOrder, myOrders, allOrders };
