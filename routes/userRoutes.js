const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Define The Routes Here

const { authenticateToken } = require("../config/middleware");
const userControllers = require("../controllers/userControllers");
const {
  addAddress,
  getAddress,
  getOrderByUser,
} = require("../controllers/userControllers");
router.get("/", (req, res) => {
  res.send("User Routes are working");
});

router.post("/login", userControllers.login);

router.post("/signup", userControllers.signup);

// Protected route example
router.get("/profile", authenticateToken, (req, res) => {
  res.json({ message: "Profile data", user: req.user });
});

router.get("/my-order/:userId", getOrderByUser);

// Protect other routes
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

router.post("/address", addAddress);
router.get("/addresses/:id", getAddress);

module.exports = router;
