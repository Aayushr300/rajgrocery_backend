const db = require("../config/db");

exports.addCouponsDB = async (couponData) => {
  const connection = await db.getConnection(); // get connection from pool
  try {
    await connection.beginTransaction();

    const {
      code,
      description,
      discount_type,
      discount_value,
      min_order_value = 0.0,
      start_date = null,
      end_date = null,
      is_active = 1,
    } = couponData;

    const query = `
      INSERT INTO coupons 
      (code,  description,discount_type, discount_value, min_order_value, start_date, end_date, is_active)
      VALUES (?, ?, ?,?, ?, ?, ?, ?)
    `;

    await connection.query(query, [
      code,
      description,
      discount_type,
      discount_value,
      min_order_value,
      start_date,
      end_date,
      is_active,
    ]);

    await connection.commit();
    return { success: true, message: "Coupon added successfully" };
  } catch (error) {
    await connection.rollback();
    console.error("Adding Coupons Error:", error);
    return { success: false, message: "Failed to add coupon" };
  } finally {
    connection.release();
  }
};

exports.getAllCouponsDB = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM coupons");
    return rows;
  } catch (err) {
    console.error("Get Coupons Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.getAllCouponsDB = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM coupons ");
    return rows;
  } catch (err) {
    console.error("Get Coupons Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};
