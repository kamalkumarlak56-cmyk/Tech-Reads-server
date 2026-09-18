const express = require("express");
const { register, login, googleLogin, allUsers } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/users", protect, adminOnly, allUsers);

module.exports = router;
