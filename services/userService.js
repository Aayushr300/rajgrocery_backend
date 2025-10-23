const mysql = require("mysql2/promise");
const db = require("../config/db");

const bcrypt = require("bcrypt");

const createUser = async ({ username, email, password, phone }) => {
  // Check if user exists

  const [rows] = await db.execute("SELECT * FROM customers WHERE email = ?", [
    email,
  ]);

  if (rows.length > 0) {
    return { success: false, message: "Email already exists" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Insert user
  const [result] = await db.execute(
    "INSERT INTO customers (name, email,phone ,password_hash ) VALUES (?, ?,?, ?)",
    [username, email, phone, hashedPassword]
  );
  return {
    success: true,
    message: "User registered",
    userId: result.insertId,
  };
};

const loginUser = async (email, password) => {
  // Find user by email
  const [rows] = await db.execute(
    "SELECT customer_id, email, password_hash FROM customers WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return { success: false, message: "User not found" };
  }

  const user = rows[0];

  const userPasswordHash = user.password_hash; // <-- fix here

  // Check password
  const valid = await bcrypt.compare(password, userPasswordHash);
  if (!valid) {
    return { success: false, message: "Invalid password" };
  }

  return { success: true, message: "Login successful", user };
};

const addressSave = async (orderAddress) => {
  try {
    const {
      user_id,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      country = "India",
      full_name,
      phone,
      is_default,
    } = orderAddress;

    // If this address is default, remove default from other addresses
    if (is_default) {
      const updateQuery = `
        UPDATE customer_addresses
        SET is_default = 0
        WHERE customer_id = ? AND is_default = 1
      `;
      await db.execute(updateQuery, [user_id]);
    }

    // Insert new address
    const insertQuery = `
      INSERT INTO customer_addresses
      (customer_id, address_line1, address_line2, city, state, postal_code, country, full_name, phone, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(insertQuery, [
      user_id,
      address_line_1,
      address_line_2 || null,
      city,
      state,
      postal_code,
      country,
      full_name,
      phone,
      is_default ? 1 : 0,
    ]);

    // // Get the newly inserted address
    // const [rows] = await db.execute(
    //   `SELECT * FROM customer_addresses WHERE id = ?`,
    //   [result.insertId]
    // );

    // Return status and address
    return {
      success: true,
      message: "Address saved successfully",
    };
  } catch (err) {
    console.error("Error in addressSave:", err);
    return {
      success: false,
      message: "Failed to save address",
      error: err.message,
    };
  }
};

const getAllAddress = async (userId) => {
  try {
    const query = `
      SELECT * FROM customer_addresses
      WHERE customer_id = ?
    `;
    const [rows] = await db.execute(query, [userId]); // using parameterized query

    return rows; // return array of addresses
  } catch (error) {
    console.error("Fetching address error:", error);
    throw error; // rethrow for controller to handle
  }
};

const getOrderItemsByOrderId = async (orderId) => {
  try {
    const query = "SELECT * FROM order_items WHERE order_id = ?";
    const [itemsRows] = await db.execute(query, [orderId]);
    return itemsRows;
  } catch (error) {
    console.error("Error fetching order items:", error);
    throw error;
  }
};

const getPaymentByOrderId = async (orderId) => {
  try {
    const query = "SELECT * FROM payments WHERE order_id = ?";
    const [paymentRows] = await db.execute(query, [orderId]);
    return paymentRows; // Could be multiple payments
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

// const getAllOrderHistoryDb = async (userId) => {
//   try {
//     if (!userId) {
//       throw new Error("User ID is required for fetching order history");
//     }

//     const query = "SELECT * FROM orders where customer_id =?";

//     const [rows] = await db.execute(query, [userId]); // wrong
//     console.log(rows);
//     return rows;
//   } catch (error) {
//     console.error("Fetching data from db order history", error);
//     throw error;
//   }
// };

const getAllOrderHistoryDb = async (userId) => {
  try {
    if (!userId) throw new Error("User ID is required");

    const query = `
      SELECT 
        o.order_id,
        o.customer_id,
        o.customer_details,
        o.total_amount,
        o.coupon_code,
        o.discount_amount,
        o.final_amount,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at,

        oi.order_item_id,
        oi.product_id,
        oi.quantity,
        oi.price AS item_price,
        oi.subtotal AS item_subtotal,
        oi.name AS product_name,
        oi.image AS product_image,

        p.payment_id,
        p.payment_method,
        p.transaction_id,
        p.amount AS payment_amount,
        p.status AS payment_status,
        p.payment_date

      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC;
    `;

    const [rows] = await db.execute(query, [userId]);

    // Group rows by order_id
    const ordersMap = {};

    rows.forEach((row) => {
      const orderId = row.order_id;

      if (!ordersMap[orderId]) {
        ordersMap[orderId] = {
          order_id: row.order_id,
          customer_id: row.customer_id,
          customer_details: row.customer_details,
          total_amount: row.total_amount,
          coupon_code: row.coupon_code,
          discount_amount: row.discount_amount,
          final_amount: row.final_amount,
          status: row.order_status,
          created_at: row.order_created_at,
          updated_at: row.order_updated_at,
          items: [],
          payments: [],
        };
      }

      // Add order item if not null
      if (row.order_item_id) {
        ordersMap[orderId].items.push({
          order_item_id: row.order_item_id,
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.item_price,
          subtotal: row.item_subtotal,
          name: row.product_name,
          image: row.product_image,
        });
      }

      // Add payment if not null and not already added (avoid duplicates)
      if (
        row.payment_id &&
        !ordersMap[orderId].payments.find(
          (p) => p.payment_id === row.payment_id
        )
      ) {
        ordersMap[orderId].payments.push({
          payment_id: row.payment_id,
          payment_method: row.payment_method,
          transaction_id: row.transaction_id,
          amount: row.payment_amount,
          status: row.payment_status,
          payment_date: row.payment_date,
        });
      }
    });

    return Object.values(ordersMap);
  } catch (error) {
    console.error("Fetching data from db order history", error);
    throw error;
  }
};

module.exports = {
  createUser,
  loginUser,
  addressSave,
  getAllAddress,
  getAllOrderHistoryDb,
};
