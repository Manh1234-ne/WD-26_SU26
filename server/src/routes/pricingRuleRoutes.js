import { Router } from "express";
import {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
} from "../controllers/pricingRuleController.js";

const router = Router();

router.get("/", getAllRules);
router.get("/:id", getRuleById);
router.post("/", createRule);
router.put("/:id", updateRule);
router.delete("/:id", deleteRule);

export default router;
