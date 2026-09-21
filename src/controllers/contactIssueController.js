const asyncHandler = require("express-async-handler");
const ContactIssue = require("../models/ContactIssue");

const createContactIssue = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400);
    throw new Error("Name, email, and message are required");
  }

  const issue = await ContactIssue.create({ name, email, message });
  res.status(201).json(issue);
});

const getContactIssues = asyncHandler(async (req, res) => {
  const issues = await ContactIssue.find({}).sort({ createdAt: -1 });
  res.json(issues);
});

module.exports = { createContactIssue, getContactIssues };
