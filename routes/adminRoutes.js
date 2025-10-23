const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticateToken } = require("../config/middleware");
const {
  registerAdmin,
  loginAdmin,
  addCategory,
  getCategories,
  addProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  addCoupons,
  getAllCoupons,
  deleteCategory,
  getProductsByCategoryDB,
} = require("../controllers/adminController");

const storage = multer.memoryStorage(); // store file in memory
const upload = multer({ storage });

// Admin login
router.post("/login", loginAdmin);

router.post("/signup", registerAdmin);

// POST - create category
router.post("/categories", upload.single("image"), addCategory);

router.delete("/categories/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Basic validation
    if (!categoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    const result = await deleteCategory(categoryId);
    console.log("Delete Category Result:", result);

    if (result.success) {
      res
        .status(200)
        .json({ success: true, message: "Category deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// GET - fetch all categories
router.get("/get-categories", getCategories);

// add a product
router.post("/add-product", upload.single("image"), addProduct);

// update a product

router.put("/update-product/:id", updateProduct);

// Delete a product
router.delete("/delete-product/:id", deleteProduct);

// get all products
router.get("/get-products", getAllProducts);

//get Coupons Section
router.post("/coupons", addCoupons);

router.get("/coupons", getAllCoupons);

// Protected route example
router.get("/profile", authenticateToken, (req, res) => {
  res.json({ message: "Profile data", user: req.user });
});

// Protect other routes
router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

module.exports = router;
