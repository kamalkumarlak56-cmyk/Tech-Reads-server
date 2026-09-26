const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");

const getProducts = asyncHandler(async (req, res) => {
  const { search = "", category, technology, sort = "latest" } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
      { technology: { $regex: search, $options: "i" } }
    ];
  }

  if (category) query.category = category;
  if (technology) query.technology = { $regex: technology, $options: "i" };

  const sortMap = {
    latest: { createdAt: -1 },
    priceLow: { price: 1 },
    priceHigh: { price: -1 },
    rating: { rating: -1 }
  };

  const products = await Product.find(query).sort(sortMap[sort] || sortMap.latest);
  res.json(products);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("createdBy", "name email");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({
    ...req.body,
    createdBy: req.user._id
  });

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const editableFields = ["title", "category", "technology", "description", "author", "price", "image", "stock", "googleBookId"];
  const updates = Object.fromEntries(
    editableFields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]])
  );
  const product = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({ message: "Product deleted" });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
