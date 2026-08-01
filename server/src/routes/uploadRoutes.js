import express from "express";
import { uploadCombo, uploadMovie } from "../controllers/uploadController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/combo", protect, uploadCombo);
router.post("/movie", protect, uploadMovie);

export default router;
