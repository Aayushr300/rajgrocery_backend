require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

const Port = process.env.PORT || 5000;
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");
const orderRoutes = require("./routes/orderRoutes");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true, // allow cookies
  })
);

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/user", userRoutes);

app.use("/api/v1", publicRoutes);
app.use("/api/v1/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

// Create Razorpay Order
app.post("/api/v1/payments/create-order", async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    const options = {
      amount, // in paise
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
});

// Verify Razorpay Payment
app.post("/api/v1/payments/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Generate signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is valid
      // TODO: Save payment info in DB if needed
      return res
        .status(200)
        .json({ success: true, message: "Payment verified" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error("Payment verification error:", err);
    res
      .status(500)
      .json({ success: false, error: "Payment verification failed" });
  }
});

app.listen(Port, () => {
  console.log(`Server is running on port ${5000}`);
});
