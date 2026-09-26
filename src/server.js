const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const googleBooksRoutes = require("./routes/googleBooksRoutes");
const contactIssueRoutes = require("./routes/contactIssueRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "3mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "SellBooks API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/google-books", googleBooksRoutes);
app.use("/api/issues", contactIssueRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const ensureAdminAccount = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD to configure the admin account");
  }

  const admin = await User.findOne({ email });
  if (admin) {
    admin.name = process.env.ADMIN_NAME?.trim() || admin.name || "Administrator";
    admin.password = password;
    admin.role = "admin";
    await admin.save();
    return admin;
  }

  return User.create({
    name: process.env.ADMIN_NAME?.trim() || "Administrator",
    email,
    password,
    role: "admin"
  });
};

const startServer = async () => {
  await connectDB();
  const configuredAdmin = await ensureAdminAccount();

  // Attach legacy products created before creator tracking was required.
  const admin = configuredAdmin || await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (admin) {
    await Product.updateMany(
      { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
      { $set: { createdBy: admin._id } }
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(`Server startup error: ${error.message}`);
  process.exit(1);
});
