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

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    { rating, comment },
    { upsert: true, new: true, runValidators: true }
  );

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

  product.rating = stats[0]?.rating || 0;
  product.reviewCount = stats[0]?.reviewCount || 0;
  await product.save();

  res.status(201).json(review);
});

module.exports = { getProductReviews, createReview };
