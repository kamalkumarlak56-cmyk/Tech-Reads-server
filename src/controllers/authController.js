const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Order = require("../models/Order");
const generateToken = require("../utils/generateToken");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const secureStringEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatar: user.avatar || "",
  addresses: user.addresses || [],
  createdAt: user.createdAt,
  token: generateToken(user)
});

const profileResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || "",
  avatar: user.avatar || "",
  addresses: user.addresses || [],
  createdAt: user.createdAt
});

const register = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password });
  res.status(201).json(authResponse(user));
});

const login = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  // First check database user credentials (supports custom admin email/password edits)
  const user = await User.findOne({ email });
  if (user && user.password && (await user.matchPassword(password))) {
    return res.json(authResponse(user));
  }

  // Fallback provisioning if no admin account exists yet in DB and env credentials match
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (!existingAdmin && process.env.ADMIN_PASSWORD && secureStringEqual(password, process.env.ADMIN_PASSWORD)) {
      const admin = await User.create({
        name: process.env.ADMIN_NAME?.trim() || "Administrator",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD,
        role: "admin"
      });
      return res.json(authResponse(admin));
    }
  }

  res.status(401);
  throw new Error("Invalid email or password");
});

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error("Google credential is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.trim().toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error("Google account email not found");
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: payload.name || "Google User",
      email,
      googleId: payload.sub
    });
  } else if (!user.googleId && payload.sub) {
    user.googleId = payload.sub;
    await user.save();
  }

  res.json(authResponse(user));
});

const allUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
  res.json(users);
});

const getUserDetails = asyncHandler(async (req, res) => {
  const [user, orders] = await Promise.all([
    User.findById(req.params.id).select("-password").lean(),
    Order.find({ user: req.params.id }).sort({ createdAt: -1 }).lean()
  ]);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ user, orders });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(profileResponse(req.user));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, password, phone, avatar, addresses } = req.body;

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400);
      throw new Error("Full name is required");
    }
    req.user.name = name.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      res.status(400);
      throw new Error("Email address is required");
    }
    if (normalizedEmail !== req.user.email) {
      const emailTaken = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id }
      });
      if (emailTaken) {
        res.status(409);
        throw new Error("Email address is already in use by another account");
      }
      req.user.email = normalizedEmail;
    }
  }

  if (password !== undefined && password !== "") {
    if (password.length < 4) {
      res.status(400);
      throw new Error("Password must be at least 4 characters");
    }
    req.user.password = password;
  }

  if (phone !== undefined) {
    req.user.phone = phone.trim();
  }

  if (avatar !== undefined) {
    req.user.avatar = avatar.trim();
  }

  if (addresses !== undefined) {
    if (!Array.isArray(addresses)) {
      res.status(400);
      throw new Error("Addresses must be a list");
    }
    req.user.addresses = addresses.map((item) => ({
      label: item.label?.trim() || "Home",
      address: item.address?.trim() || "",
      city: item.city?.trim() || "",
      postalCode: item.postalCode?.trim() || ""
    })).filter((item) => item.address);
  }

  await req.user.save();
  res.json(profileResponse(req.user));
});

module.exports = { register, login, googleLogin, allUsers, getUserDetails, getProfile, updateProfile };
