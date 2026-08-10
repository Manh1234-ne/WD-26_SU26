import express from "express";
import {
  createComboOrder,
  getAllComboOrders,
  getComboOrderById,
} from "../controllers/comboOrderController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isStaffOrAdmin } from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post("/", protect, isStaffOrAdmin, createComboOrder);
router.get("/", protect, isStaffOrAdmin, getAllComboOrders);
router.get("/:id", protect, isStaffOrAdmin, getComboOrderById);

export default router;
