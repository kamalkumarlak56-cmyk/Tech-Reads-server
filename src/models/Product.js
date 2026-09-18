const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Book", "Article", "Newspaper"],
      required: true
    },
    technology: { type: String, trim: true },
    description: { type: String, required: true },
    author: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    stock: { type: Number, default: 1, min: 0 },
    googleBookId: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    purchasedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
