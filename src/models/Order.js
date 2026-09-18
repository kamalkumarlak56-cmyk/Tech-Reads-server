const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    title: String,
    image: String,
    price: Number,
    quantity: { type: Number, default: 1 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [orderItemSchema],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "delivered", "cancelled"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      default: "demo"
    },
    customerName: String,
    shippingEmail: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
