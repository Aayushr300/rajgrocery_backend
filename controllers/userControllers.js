const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  createUser,
  loginUser,
  addressSave,
  getAllAddress,
  getAllOrderHistoryDb,
} = require("../services/userService");

exports.signup = async (req, res) => {
  const { username, email, phone, password } = req.body;

  try {
    const response = await createUser({ username, email, password, phone });

    if (!response.success) {
      return res.status(409).json({ message: response.message });
    }
    res.json({ message: response.message, userId: response.userId });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await loginUser(email, password);

    if (!response || !response.success) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: response.user.customer_id, username: response.user.email },
      process.env.JWT_TOKEN,
      { expiresIn: "1h" }
    );

    console.log("Login success, sending response...");
    res.json({
      message: response.message,
      user: {
        id: response.user.customer_id,
        email: response.user.email,
      },

      jwt: token,
    });
  } catch (err) {
    console.error("Login error:", err); // <- log full error
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const {
      user_id,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country,
      full_name,
      phone,
      is_default,
      address_type = "home",
    } = req.body;

    const orderAddress = {
      user_id,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country: country || "India",
      full_name,
      phone,
      is_default,
      address_type,
    };

    // Validate required fields
    if (!user_id || !address_line_1 || !city || !state || !postal_code) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // If setting as default, remove default from other addresses
    if (is_default) {
      await addressSave(orderAddress);
    }

    res.status(200).json({
      success: true,
      message: "Address saved successfully",
    });
  } catch (error) {
    console.error("Save address error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

exports.getAddress = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await getAllAddress(userId); // your DB function

    res.status(200).json(result);
  } catch (err) {
    console.error("Fetch address error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

exports.getOrderByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await getAllOrderHistoryDb(userId);
    res.json(response);
  } catch (error) {
    console.log("Fetching order history");
  }
};
