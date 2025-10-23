const {
  getCategoryDb,
  getProductDb,
  getProductByCategory,
  getAllCouponsDB,
  getCategoryByName,
  getProductsByCategory,
} = require("../services/publicService");

exports.getCategories = async (req, res) => {
  try {
    const data = await getCategoryDb();
    return res.json({
      data,
      status: 200,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getProducts = async (req, res) => {
  try {
    const response = await getProductDb();

    return res.json({
      status: 200,
      products: response,
    });
  } catch (error) {
    console.log("Error", error);
    return res.status(500).json({ message: "Fetching Product Issue" });
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

// dbController.js
exports.getProductsByCategoryDB = async (categoryId) => {
  try {
    console.log("Category ID in Controller:", categoryId);
    const data = await getProductByCategory(categoryId);

    return data; // return plain data, not res.json()
  } catch (error) {
    console.error("DB error:", error);
    throw error;
  }
};

exports.getCategoryName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const category = await getCategoryByName(name);
    console.log("data", category);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ id: category }); // or category._id depending on your DB schema
  } catch (error) {
    console.error("Error fetching category ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
