const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    googleId: { type: String },
    phone: { type: String, trim: true, maxlength: 25 },
    avatar: { type: String, trim: true },
    addresses: [{
      label: { type: String, trim: true, default: "Home", maxlength: 40 },
      address: { type: String, trim: true, required: true, maxlength: 250 },
      city: { type: String, trim: true, maxlength: 80 },
      postalCode: { type: String, trim: true, maxlength: 20 }
    }],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
