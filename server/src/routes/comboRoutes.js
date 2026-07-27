import express from "express";

import {
  getAllCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
} from "../controllers/comboController.js";

const routerCombo = express.Router();

routerCombo.get("/", getAllCombos);

routerCombo.get("/:id", getComboById);

routerCombo.post("/", createCombo);

routerCombo.put("/:id", updateCombo);

routerCombo.delete("/:id", deleteCombo);

export default routerCombo;