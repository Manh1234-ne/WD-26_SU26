import express from "express"
import routerMovie from "./movieRoutes.js";
import routerAuth from "./authRoutes.js";
import routerCinema from "./cinemaRoutes.js";
const router = express.Router();

router.use("/movies", routerMovie);
router.use("/auth", routerAuth);
router.use('/cinemas', routerCinema);
export default router
import express from "express";
import movieRoutes from "./movieRoutes.js";
import authRoutes from "./authRoutes.js";
import categoryRoutes from "./categoryRoutes.js";

const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/movies", movieRoutes);

// Health check - Kiểm tra API còn chạy không
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
