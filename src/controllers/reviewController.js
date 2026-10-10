const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const Product = require("../models/Product");

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  res.json(reviews);
});

const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.productId);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  if (!comment || !comment.trim()) {
    res.status(400);
    throw new Error("Review comment is required");
  }

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    { rating: numRating, comment: comment.trim() },
    { upsert: true, new: true, runValidators: true }
  ).populate("user", "name");

  const stats = await Review.aggregate([
    { $match: { product: product._id } },
    {
      $group: {
        _id: "$product",
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  product.rating = stats[0]?.rating ? Math.round(stats[0].rating * 10) / 10 : 0;
  product.reviewCount = stats[0]?.reviewCount || 0;
  await product.save();

  res.status(201).json(review);
});

module.exports = { getProductReviews, createReview };
