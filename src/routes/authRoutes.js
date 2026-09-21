const express = require("express");
const { register, login, googleLogin, allUsers, getProfile, updateProfile } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.route("/profile").get(protect, getProfile).put(protect, updateProfile);
router.get("/users", protect, adminOnly, allUsers);

module.exports = router;
