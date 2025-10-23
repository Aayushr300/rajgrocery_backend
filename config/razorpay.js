const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Verify Razorpay signature
const verifyPaymentSignature = (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  const crypto = require("crypto");

  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpaySignature;
};

module.exports = {
  razorpay,
  verifyPaymentSignature,
};
