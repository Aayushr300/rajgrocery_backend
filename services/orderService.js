const db = require("../config/db");

// generate invoice number
const generateInvoiceNumber = async (connection) => {
  const [rows] = await connection.query(
    "SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = YEAR(NOW())"
  );
  const count = rows[0].count + 1;
  return `INV-${new Date().getFullYear()}-${String(count).padStart(
    4,
    "4",
    "0"
  )}`;
};

// Helper to convert JS Date / ISO string to MySQL DATETIME
const toMySQLDateTime = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace("T", " ");
};

exports.confirmOrderDB = async (orderData) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      order_id,
      customer_id,
      payment_method,
      payment_id,
      payment_status,
      total_amount,
      coupon_code,
      discount_amount,
      final_amount,
      status,
      created_at,
      customer_details,
      order_items = [],
      invoice = {},
    } = orderData;

    const createdAt = created_at
      ? toMySQLDateTime(created_at)
      : toMySQLDateTime(new Date());

    // 1️⃣ Insert into orders
    await connection.execute(
      `INSERT INTO orders 
      (order_id, customer_id, customer_details, total_amount, coupon_code, discount_amount, final_amount, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        customer_id,
        JSON.stringify(customer_details || {}),
        total_amount ?? 0,
        coupon_code ?? null,
        discount_amount ?? 0,
        final_amount ?? total_amount ?? 0,
        status || "pending",
        createdAt,
        toMySQLDateTime(new Date()),
      ]
    );

    // 2️⃣ Insert order items
    for (const item of order_items) {
      await connection.execute(
        `INSERT INTO order_items
        (order_id, product_id, quantity, price, subtotal, name, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          item.product_id ?? null,
          item.quantity ?? 0,
          item.price ?? 0,
          item.subtotal ?? (item.quantity ?? 0) * parseFloat(item.price ?? 0),
          item.name ?? null,
          item.image ?? null,
        ]
      );
    }

    // 3️⃣ Insert payment
    await connection.execute(
      `INSERT INTO payments
      (order_id, payment_method, transaction_id, amount, status, payment_date)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        payment_method ?? null,
        payment_id ?? null,
        final_amount ?? total_amount ?? 0,
        payment_status ?? (payment_method === "cod" ? "pending" : "success"),
        createdAt,
      ]
    );

    // 4️⃣ Generate invoice number
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM invoices WHERE YEAR(created_at) = YEAR(NOW())"
    );
    const count = rows[0].count + 1;
    const invoice_number = `INV-${new Date().getFullYear()}-${String(
      count
    ).padStart(4, "0")}`;

    // 5️⃣ Insert invoice
    await connection.execute(
      `INSERT INTO invoices
      (order_id, invoice_number, billing_name, billing_address, billing_phone, total_amount, discount_amount, final_amount, tax_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        invoice_number,
        invoice.billing_name ?? null,
        invoice.billing_address ?? null,
        invoice.billing_phone ?? null,
        invoice.total_amount ?? final_amount ?? total_amount ?? 0,
        invoice.discount_amount ?? 0,
        invoice.final_amount ?? final_amount ?? total_amount ?? 0,
        invoice.tax_amount ?? 0,
        createdAt,
      ]
    );

    await connection.commit();
    connection.release();

    return {
      order_id,
      invoice_number,
      message: "Order confirmed successfully",
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("ConfirmOrderDB Error:", error);
    throw error;
  }
};

exports.getOrderById = async (orderId) => {
  const connection = await db.getConnection();
  try {
    // Fetch main order
    const [orderRows] = await connection.execute(
      `SELECT * FROM orders WHERE order_id = ?`,
      [orderId]
    );
    if (orderRows.length === 0) return null;
    const order = orderRows[0];

    // Fetch order items
    const [itemsRows] = await connection.execute(
      `SELECT oi.*, p.name, p.image_url
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const orderItems = itemsRows.map((item) => ({
      productId: item.product_id,
      name: item.name,
      image: item.image_url,
      quantity: item.quantity,
      sellingPrice: parseFloat(item.price),
      subtotal: parseFloat(item.subtotal),
    }));

    // Fetch invoice info
    const [invoiceRows] = await connection.execute(
      `SELECT * FROM invoices WHERE order_id = ?`,
      [orderId]
    );
    const invoice = invoiceRows[0] || {};

    let shippingAddress = null;
    if (order.customer_details) {
      if (typeof order.customer_details === "string") {
        shippingAddress = JSON.parse(order.customer_details);
      } else {
        shippingAddress = order.customer_details; // already object
      }
    }

    return {
      ...order,
      order_item: orderItems,
      invoice_number: invoice.invoice_number,
      shippingAddress,
    };
  } catch (err) {
    console.error("getOrderById error:", err);
    throw err;
  } finally {
    connection.release();
  }
};
