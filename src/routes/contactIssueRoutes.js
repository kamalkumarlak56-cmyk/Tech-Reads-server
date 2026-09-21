const express = require("express");
const { createContactIssue, getContactIssues } = require("../controllers/contactIssueController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(createContactIssue).get(protect, adminOnly, getContactIssues);

module.exports = router;
