import express from "express";
import { getShowtimeStatistics } from "../controllers/statisticsController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.get("/showtimes", protect, isAdmin, getShowtimeStatistics);

export default router;
