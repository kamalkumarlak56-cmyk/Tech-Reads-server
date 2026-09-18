const jwt = require("jsonwebtoken");

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

module.exports = generateToken;
