const asyncHandler = require("express-async-handler");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user)
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
  const { email, password } = req.body;
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

module.exports = { register, login, googleLogin, allUsers };
