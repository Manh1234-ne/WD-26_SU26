import express from "express";
import movieRoutes from "./movieRoutes.js";
import authRoutes from "./authRoutes.js";
import cinemaRoutes from "./cinemaRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import roomRoutes from "./roomRoutes.js";
import seatRoutes from "./seatRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import showtimeRoutes from "./showtimeRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import mockMomoRoutes from "./mockMomoRoutes.js";
import bookingSeatRoutes from "./bookingSeatRoutes.js"
import reviewRoutes from "./reviewRoutes.js";
import userRoutes from "./userRoutes.js";
const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/movies", movieRoutes);
router.use("/cinemas", cinemaRoutes);
router.use("/rooms", roomRoutes);
router.use("/seats", seatRoutes);
router.use("/bookings", bookingRoutes);
router.use("/showtimes", showtimeRoutes);
router.use("/payments", paymentRoutes);
router.use("/mock-momo", mockMomoRoutes);
router.use("/booking-seats", bookingSeatRoutes);
router.use("/reviews", reviewRoutes);
router.use("/users", userRoutes);

// Health check - Kiểm tra API còn chạy không
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;

