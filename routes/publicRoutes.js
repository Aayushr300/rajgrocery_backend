const express = require("express");
const router = express.Router();

// Define The Routes Here
const {
  getCategories,
  getProducts,
  getAllCoupons,
  getProductsByCategoryDB,
  getCategoryName,
} = require("../controllers/publicController");
router.get("/", (req, res) => {
  res.send("pUBLIC aPI RUNNING");
});
router.get("/get-categories", getCategories);
router.get("/get-products", getProducts);

// Get Product By Category
router.get("/products/category/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log("Category Id:", categoryId);

    const products = await getProductsByCategoryDB(categoryId);

    console.log("Products by Category:", { products });
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




// get category by name
router.get("/get-category-id", getCategoryName);

router.get("/coupons", getAllCoupons);
module.exports = router;
