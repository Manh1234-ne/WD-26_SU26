import express from "express";
import movieRoutes from "./movieRoutes.js";
import authRoutes from "./authRoutes.js";
import cinemaRoutes from "./cinemaRoutes.js";
import categoryRoutes from "./categoryRoutes.js";

const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/movies", movieRoutes);
router.use("/cinemas", cinemaRoutes);

// Health check - Kiểm tra API còn chạy không
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;

