// controllers/adminController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // your db connection
const cloudinary = require("../config/cloudinary");
const JWT_SECRET = "aayush";

const { addCouponsDB, getAllCouponsDB } = require("../services/adminServices");
exports.registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  const [existing] = await db.execute("SELECT * FROM admins WHERE email = ?", [
    email,
  ]);
  if (existing.length > 0)
    return res.status(400).json({ message: "Admin already exists" });

  const hashed = await bcrypt.hash(password, 10);
  await db.execute(
    "INSERT INTO admins (name,email,password_hash) VALUES (?,?,?)",
    [name, email, hashed]
  );

  res.json({ message: "Admin registered successfully" });
};

exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.execute("SELECT * FROM admins WHERE email = ?", [
    email,
  ]);
  if (rows.length === 0)
    return res.status(404).json({ message: "Admin not found" });

  const admin = rows[0];

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign(
    { admin_id: admin.admin_id, name: admin.name },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
  res.json({ message: "Login successful", token });
};

exports.addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const created_by = req.user?.id || 1; // get from auth middleware / session

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    let imageUrl = null;

    // ✅ If image file exists, upload to Cloudinary
    if (req.file) {
      const base64Image = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;

      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "Categories", // 👈 upload to 'Categories' folder in Cloudinary
      });

      imageUrl = uploadResponse.secure_url; // store this URL in DB
    }

    // ✅ Insert into MySQL
    const [result] = await db.execute(
      "INSERT INTO categories (name, description, image_url, created_by) VALUES (?, ?, ?, ?)",
      [name, description || null, imageUrl, created_by]
    );

    res.json({
      success: true,
      category: {
        id: result.insertId,
        name,
        description,
        image_url: imageUrl,
        created_by,
      },
    });
  } catch (err) {
    console.error("Add Category Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT  category_id ,name,description, image_url  FROM categories"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Add other admin functions as needed
exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      category_id,
      description,
      mrp,
      selling_price,
      stock,
      is_active,
    } = req.body;
    console.log("Request Body", req.body);
    let imageUrl = null;

    // Upload image to Cloudinary if file exists
    if (req.file) {
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" }, // optional folder name
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(buffer);
        });
      };

      const result = await streamUpload(req.file.buffer);
      imageUrl = result.secure_url; // this is the Cloudinary URL
    }

    // Prepare product object
    const newProduct = {
      name,
      category_id: parseInt(category_id),
      description,
      mrp: parseFloat(mrp),
      selling_price: parseFloat(selling_price),
      stock: parseInt(stock),
      is_active: is_active === "true" || is_active === true,
      image_url: imageUrl,
    };

    // Insert into MySQL
    const query = `
      INSERT INTO products 
      (name, category_id, description, mrp, selling_price, stock, image_url, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      newProduct.name,
      newProduct.category_id,
      newProduct.description,
      newProduct.mrp,
      newProduct.selling_price,
      newProduct.stock,
      newProduct.image_url,
      newProduct.is_active ? 1 : 0,
    ];

    const [result] = await db.execute(query, values);

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product_id: result.insertId,
      product: newProduct,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.product_id, p.name, p.description, p.mrp, p.selling_price, p.stock, p.image_url, p.is_active, c.name AS category
       FROM products p 
        LEFT JOIN categories c ON p.category_id = c.category_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category_id,
      description,
      mrp,
      selling_price,
      stock,
      is_active,
    } = req.body;

    // Build dynamic query based on provided fields
    const fields = [];
    const values = [];
    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (category_id) {
      fields.push("category_id = ?");
      values.push(parseInt(category_id));
    }
    if (description) {
      fields.push("description = ?");
      values.push(description);
    }
    if (mrp) {
      fields.push("mrp = ?");
      values.push(parseFloat(mrp));
    }
    if (selling_price) {
      fields.push("selling_price = ?");
      values.push(parseFloat(selling_price));
    }
    if (stock) {
      fields.push("stock = ?");
      values.push(parseInt(stock));
    }
    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active === "true" || is_active === true ? 1 : 0);
    }
    values.push(id); // for WHERE clause
    const query = `UPDATE products SET ${fields.join(
      ", "
    )} WHERE product_id = ?`;
    const [result] = await db.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error(error);

    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Delete Product ID:", id);
    const [result] = await db.execute(
      "DELETE FROM products WHERE product_id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ status: 200, message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res

      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports.addCoupons = async (req, res) => {
  try {
    const couponData = req.body;

    // Call the DB function to insert the coupon
    const response = await addCouponsDB(couponData);

    if (response.success) {
      return res.status(201).json({ message: response.message });
    } else {
      return res.status(400).json({ message: response.message });
    }
  } catch (error) {
    console.error("Adding coupons Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const response = await getAllCouponsDB();

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

exports.deleteCategory = async (categoryId) => {
  try {
    const [result] = await db.execute(
      "DELETE FROM categories WHERE category_id = ?",
      [categoryId]
    );
    console.log("Delete Category Result:", result);
    if (result.affectedRows === 0) {
      return { success: false, message: "Category not found" };
    } else {
      return { success: true, message: "Category deleted successfully" };
    }
  } catch (error) {
    console.error("Delete Category Error:", error);
    return { success: false, message: "Internal Server Error" };
  }
};
