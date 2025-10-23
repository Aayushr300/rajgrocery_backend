const express = require("express");
const router = express.Router();
const {
  confirmOrder,
  getSuccessfullOrder,
  downloadInvoice,
} = require("../controllers/orderController");

router.post("/order-confirm", confirmOrder);

// GET order by ID
router.get("/:orderId", getSuccessfullOrder);

router.get("/:orderId/invoice", downloadInvoice);

module.exports = router;
