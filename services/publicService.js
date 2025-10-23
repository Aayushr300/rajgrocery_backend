const db = require("../config/db");

exports.getCategoryDb = async (req, res) => {
  try {
    const query = "select * from categories ";
    const [result] = await db.execute(query);
    return result;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getProductDb = async (req, res) => {
  try {
    const query =
      "SELECT  p.product_id,p.name AS product_name,p.description AS product_description,p.mrp,p.selling_price,p.stock,p.image_url,p.is_active,c.category_id,c.name AS category_name,c.description AS category_description FROM products p JOIN categories c ON p.category_id = c.category_id WHERE p.is_active = 1;";
    const [rows] = await db.execute(query);
    return rows;
  } catch (err) {
    console.log("fetching issue from database ", error);
  }
};

exports.getAllCouponsDB = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM coupons where  is_active=1");
    return rows;
  } catch (err) {
    console.error("Get Coupons Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
};

exports.getProductByCategory = async (categoryId) => {
  try {
    console.log("Category number", categoryId);
    const [rows] = await db.execute(
      `SELECT *
        FROM products where  category_id = ?`,
      [categoryId]
    );
    return rows;
  } catch (err) {
    console.error("Get Products By Category Error:", err);
    throw err;
  }
};

exports.getCategoryByName = async (name) => {
  try {
    console.log("Category name:", name);

    const [rows] = await db.execute(
      `SELECT category_id FROM categories WHERE name = ?`,
      [name]
    );

    if (rows.length === 0) {
      throw new Error("Category not found");
    }

    const categoryId = rows[0].category_id;
    return categoryId;
  } catch (err) {
    console.error("Get Category By Name Error:", err);
    throw err;
  }
};
