import express from "express";
import categoryController from "../controllers/categoryController.js";

const router = express.Router();

// GET routes
router.get("/", categoryController.getAllCategories);
router.get("/search", categoryController.searchCategories);
router.get("/slug/:slug", categoryController.getCategoryBySlug);
router.get("/:id", categoryController.getCategoryById);

// POST route
router.post("/", categoryController.createCategory);

// PUT route
router.put("/:id", categoryController.updateCategory);

// DELETE route
router.delete("/:id", categoryController.deleteCategory);

export default router;
