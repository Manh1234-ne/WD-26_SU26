import express from "express";
import categoryController from "../controllers/categoryController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// GET routes
router.get("/", categoryController.getAllCategories);
router.get("/search", categoryController.searchCategories);
router.get("/slug/:slug", categoryController.getCategoryBySlug);
router.get("/:id", categoryController.getCategoryById);

// POST route
router.post("/", protect, isAdmin, categoryController.createCategory);

// PUT route
router.put("/:id", protect, isAdmin, categoryController.updateCategory);

// DELETE route
router.delete("/:id", protect, isAdmin, categoryController.deleteCategory);

export default router;
