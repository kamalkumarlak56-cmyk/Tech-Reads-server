const mongoose = require("mongoose");

const contactIssueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["new", "read", "resolved"], default: "new" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactIssue", contactIssueSchema);
