const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
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
  token: generateToken(user)
});

const profileResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  avatar: user.avatar || "",
  addresses: user.addresses || []
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) {
    // The configured admin can sign in even if startup provisioning did not run
    // (for example, when the environment variables were added after startup).
    if (!process.env.ADMIN_PASSWORD || !secureStringEqual(password, process.env.ADMIN_PASSWORD)) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: process.env.ADMIN_NAME?.trim() || "Administrator",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD,
        role: "admin"
      });
    } else {
      admin.name = process.env.ADMIN_NAME?.trim() || admin.name || "Administrator";
      admin.role = "admin";
      if (!admin.password || !(await admin.matchPassword(process.env.ADMIN_PASSWORD))) {
        admin.password = process.env.ADMIN_PASSWORD;
      }
    }
    await admin.save();
    return res.json(authResponse(admin));
  }

  const user = await User.findOne({ email });

  if (user && user.password && (await user.matchPassword(password))) {
    return res.json(authResponse(user));
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
  let user = await User.findOne({ email: payload.email });

  if (!user) {
    user = await User.create({
      name: payload.name,
      email: payload.email,
      googleId: payload.sub
    });
  }

  res.json(authResponse(user));
});

const allUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("name email role createdAt").sort({ createdAt: -1 });
  res.json(users);
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(profileResponse(req.user));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar, addresses } = req.body;

  if (!name?.trim()) {
    res.status(400);
    throw new Error("Full name is required");
  }

  if (addresses !== undefined && !Array.isArray(addresses)) {
    res.status(400);
    throw new Error("Addresses must be a list");
  }

  req.user.name = name.trim();
  req.user.phone = phone?.trim() || "";
  req.user.avatar = avatar?.trim() || "";
  if (addresses !== undefined) {
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

module.exports = { register, login, googleLogin, allUsers, getProfile, updateProfile };
