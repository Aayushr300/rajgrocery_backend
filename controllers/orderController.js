const db = require("../config/db");

const { confirmOrderDB, getOrderById } = require("../services/orderService");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const bwipjs = require("bwip-js"); // For barcode

exports.confirmOrder = async (req, res) => {
  try {
    const orderData = req.body;

    console.log("Order Data:", orderData);

    // Call DB function
    const dbResponse = await confirmOrderDB(orderData);

    console.log("DB Response:", dbResponse);

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      data: dbResponse,
    });
  } catch (error) {
    console.error("Confirm Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Creating Confirm Order issue",
      error: error.message,
    });
  }
};

// exports.getSuccessfullOrder = async (req, res) => {
//   const { orderId } = req.params;

//   try {
//     const connection = await db.getConnection();

//     // 1️⃣ Fetch order
//     const [orderRows] = await connection.execute(
//       `SELECT * FROM orders WHERE order_id = ?`,
//       [orderId]
//     );

//     if (orderRows.length === 0) {
//       connection.release();
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const order = orderRows[0];

//     // 2️⃣ Fetch order items
//     const [orderItemsRows] = await connection.execute(
//       `SELECT oi.*, p.name, p.image_url
//        FROM order_items oi
//        JOIN products p ON p.product_id = oi.product_id
//        WHERE oi.order_id = ?`,
//       [orderId]
//     );

//     const orderItems = orderItemsRows.map((item) => ({
//       productId: item.product_id,
//       name: item.name,
//       image: item.image_url,
//       quantity: item.quantity,
//       sellingPrice: parseFloat(item.price),
//       subtotal: parseFloat(item.subtotal),
//     }));

//     // 3️⃣ Fetch payment info
//     const [paymentRows] = await connection.execute(
//       `SELECT * FROM payments WHERE order_id = ?`,
//       [orderId]
//     );

//     const payment = paymentRows[0] || {};

//     // 4️⃣ Fetch invoice info
//     const [invoiceRows] = await connection.execute(
//       `SELECT * FROM invoices WHERE order_id = ?`,
//       [orderId]
//     );

//     const invoice = invoiceRows[0] || {};

//     connection.release();

//     return res.json({
//       order_id: order.order_id,
//       total_amount: parseFloat(order.total_amount),
//       discount_amount: parseFloat(order.discount_amount),
//       final_amount: parseFloat(order.final_amount),
//       status: order.status,
//       created_at: order.created_at,
//       order_item: orderItems,
//       paymentMethod: payment.payment_method || "cod",
//       paymentStatus: payment.status || "pending",
//       invoice_number: invoice.invoice_number || null,
//       shippingAddress: order.customer_details
//         ? JSON.parse(order.customer_details)
//         : null,
//     });
//   } catch (error) {
//     console.error("Fetch order error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// Get Successfull Order (like confirmOrder)
exports.getSuccessfullOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const connection = await db.getConnection();

    // 1️⃣ Fetch order
    const [orderRows] = await connection.execute(
      `SELECT * FROM orders WHERE order_id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderRows[0];

    // 2️⃣ Fetch order items
    const [orderItemsRows] = await connection.execute(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const orderItems = orderItemsRows.map((item) => ({
      productId: item.product_id,
      name: item.name,
      image: item.image_url,
      quantity: item.quantity,
      sellingPrice: parseFloat(item.price),
      subtotal: parseFloat(item.subtotal),
    }));

    // 3️⃣ Fetch payment info
    const [paymentRows] = await connection.execute(
      `SELECT * FROM payments WHERE order_id = ?`,
      [orderId]
    );

    const payment = paymentRows[0] || {};

    // 4️⃣ Fetch invoice info
    const [invoiceRows] = await connection.execute(
      `SELECT * FROM invoices WHERE order_id = ?`,
      [orderId]
    );

    const invoice = invoiceRows[0] || {};

    connection.release();

    // ✅ Fix for JSON parsing issue
    let shippingAddress = null;
    if (order.customer_details) {
      shippingAddress =
        typeof order.customer_details === "string"
          ? JSON.parse(order.customer_details)
          : order.customer_details;
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: {
        order_id: order.order_id,
        total_amount: parseFloat(order.total_amount),
        discount_amount: parseFloat(order.discount_amount),
        final_amount: parseFloat(order.final_amount),
        status: order.status,
        created_at: order.created_at,
        order_item: orderItems,
        paymentMethod: payment.payment_method || "cod",
        paymentStatus: payment.status || "pending",
        invoice_number: invoice.invoice_number || null,
        shippingAddress,
      },
    });
  } catch (error) {
    console.error("Fetch order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// exports.downloadInvoice = async (req, res) => {
//   const { orderId } = req.params;

//   // Fetch order from DB
//   const order = await getOrderById(orderId);
//   if (!order) return res.status(404).send("Order not found");

//   console.log("Order", order);

//   // Convert string amounts to numbers
//   const totalAmount = parseFloat(order.total_amount || 0);
//   const discountAmount = parseFloat(order.discount_amount || 0);
//   const finalAmount = parseFloat(order.final_amount || totalAmount);
//   const taxAmount = parseFloat(totalAmount * 0.05);

//   const doc = new PDFDocument({ size: "A4", margin: 50 });

//   // Set response headers to download
//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader(
//     "Content-Disposition",
//     `attachment; filename=invoice-${orderId}.pdf`
//   );

//   // Pipe PDF to response
//   doc.pipe(res);

//   // Company Info
//   doc.fontSize(20).text("Your Store", { align: "center" });
//   doc.fontSize(10).text("Address, City, State, ZIP", { align: "center" });
//   doc.moveDown();

//   // Invoice Info
//   doc.fontSize(14).text(`Invoice Number: ${order.invoice_number}`);
//   doc.text(`Order ID: ${order.order_id}`);
//   doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
//   doc.moveDown();

//   // Customer Info
//   const customer = order.shippingAddress;
//   doc.text(`Customer: ${customer.full_name}`);
//   doc.text(`Email: ${customer.email}`);
//   doc.text(`Phone: ${customer.phone}`);
//   doc.text(
//     `Address: ${customer.address.address_line_1}, ${
//       customer.address.address_line_2 || ""
//     }, ${customer.address.city}, ${customer.address.state}, ${
//       customer.address.postal_code
//     }, ${customer.address.country}`
//   );
//   doc.moveDown();

//   // Table Header
//   doc.fontSize(12).text("Items:", { underline: true });
//   doc.moveDown(0.5);

//   order.order_item.forEach((item) => {
//     doc.text(
//       `${item.name} - Qty: ${item.quantity} - Price: ₹${parseFloat(
//         item.sellingPrice
//       ).toFixed(2)} - Subtotal: ₹${(item.sellingPrice * item.quantity).toFixed(
//         2
//       )}`
//     );
//   });

//   doc.moveDown();
//   doc.text(`Subtotal: ₹${totalAmount.toFixed(2)}`);
//   doc.text(`Discount: ₹${discountAmount.toFixed(2)}`);
//   doc.text(`Tax: ₹${taxAmount.toFixed(2)}`);
//   doc.text(`Total: ₹${finalAmount.toFixed(2)}`, { bold: true });

//   doc.end();
// };

exports.downloadInvoice = async (req, res) => {
  const { orderId } = req.params;
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).send("Order not found");

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  // Stream PDF to client
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=invoice-${order.invoice_number}.pdf`
  );
  doc.pipe(res);

  // --- Header ---
  doc.fontSize(16).font("Helvetica-Bold").text("Payment Receipt", 50, 50);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Receipt Number: ${order.invoice_number}`, 50, 70);

  doc.moveDown(1);

  // --- Sold By Section ---
  doc.fontSize(10).font("Helvetica-Bold").text("Sold By,", 50, 100);

  doc
    .font("Helvetica")
    .text("Your Store", 50, 115)
    .text("Address, City, State, ZIP", 50, 128)
    .text("Contact: 1234567890", 50, 141);

  let yPosition = 160;

  // --- Order Details ---
  doc.font("Helvetica").text(`Order no: ${order.order_id}`, 50, yPosition);
  doc.text(
    `Order Date: ${new Date(order.created_at).toLocaleDateString()}`,
    50,
    yPosition + 13
  );
  doc.text(
    `Invoice Date: ${new Date(order.created_at).toLocaleDateString()}`,
    50,
    yPosition + 26
  );
  doc.text(`GSTIN:`, 50, yPosition + 39);

  yPosition += 60;

  // --- Horizontal Line ---
  doc
    .moveTo(50, yPosition)
    .lineTo(doc.page.width - 50, yPosition)
    .stroke();

  yPosition += 10;

  // --- Table Header ---
  const columns = [
    { x: 50, width: 150, name: "Description" },
    { x: 200, width: 60, name: "Net Amount" },
    { x: 260, width: 40, name: "Quantity" },
    { x: 300, width: 40, name: "COST" },
    { x: 340, width: 50, name: "COST Amount" },
    { x: 390, width: 40, name: "SGST" },
    { x: 430, width: 50, name: "SGST Amount" },
    { x: 480, width: 60, name: "Total Amount" },
  ];

  // Table header background
  doc
    .fillColor("#f0f0f0")
    .rect(50, yPosition, doc.page.width - 100, 20)
    .fill();

  // Table header text
  doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");

  columns.forEach((col) => {
    doc.text(col.name, col.x, yPosition + 6, { width: col.width });
  });

  yPosition += 25;

  // --- Table Rows ---
  doc.font("Helvetica");
  order.order_item.forEach((item, index) => {
    const rowY = yPosition + index * 40;

    // Item description (wrapped)
    doc.text(item.name, columns[0].x, rowY, {
      width: columns[0].width,
      height: 30,
      ellipsis: true,
    });

    // Net Amount
    doc.text(`₹${item.sellingPrice.toFixed(2)}`, columns[1].x, rowY, {
      width: columns[1].width,
    });

    // Quantity
    doc.text(item.quantity.toString(), columns[2].x, rowY, {
      width: columns[2].width,
    });

    // COST (%)
    doc.text("0 %", columns[3].x, rowY, {
      width: columns[3].width,
    });

    // COST Amount
    doc.text("0.00", columns[4].x, rowY, {
      width: columns[4].width,
    });

    // SGST (%)
    doc.text("0 %", columns[5].x, rowY, {
      width: columns[5].width,
    });

    // SGST Amount
    doc.text("0.00", columns[6].x, rowY, {
      width: columns[6].width,
    });

    // Total Amount
    doc.text(
      `₹${(item.sellingPrice * item.quantity).toFixed(2)}`,
      columns[7].x,
      rowY,
      {
        width: columns[7].width,
      }
    );
  });

  yPosition += order.order_item.length * 40 + 20;

  // --- Horizontal Line ---
  doc
    .moveTo(50, yPosition)
    .lineTo(doc.page.width - 50, yPosition)
    .stroke();

  yPosition += 15;

  // --- Total Amount ---
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `Total Amount: ₹${parseFloat(order.final_amount).toFixed(2)}`,
      50,
      yPosition
    );

  yPosition += 30;

  // --- Payment Method ---
  doc
    .font("Helvetica")
    .text(`Payment Method: ${order.payment_method || "Cash"}`, 50, yPosition);

  yPosition += 40;

  // --- Declaration ---
  doc.fontSize(9).font("Helvetica-Bold").text("DECLARATION:", 50, yPosition);

  doc
    .font("Helvetica")
    .text(
      "This is an invoice for confirmation of the receipt of the amount paid against for the service as described above.",
      50,
      yPosition + 12,
      {
        width: doc.page.width - 100,
      }
    );

  doc.text(
    "* Keep this invoice and manufacturer box for warranty purpose",
    50,
    yPosition + 30,
    {
      width: doc.page.width - 100,
    }
  );

  yPosition += 60;

  // --- Footer Note ---
  doc
    .fontSize(8)
    .text(
      "(This is computer generated receipt and does not require physical signature.)",
      50,
      yPosition,
      { align: "center" }
    );

  doc.text(
    "Your Store | Address, City, State, ZIP | Contact: 1234567890",
    50,
    yPosition + 15,
    { align: "center" }
  );

  doc.end();
};
