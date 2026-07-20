import express from "express";

import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  restockInventory,
  getLowStock,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/", getAllInventory);

router.get("/low-stock", getLowStock);

router.get("/:id", getInventoryById);

router.post("/", createInventory);

router.put("/:id", updateInventory);

router.patch("/:id/restock",restockInventory);

router.delete("/:id", deleteInventory);

export default router;