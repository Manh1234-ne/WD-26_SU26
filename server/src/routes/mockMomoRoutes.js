import express from "express";
import {
  createMockMomo,
  mockMomoPage,
  mockMomoSuccess,
  mockMomoFail,
} from "../controllers/mockMomoController.js";

const router = express.Router();

router.post("/create", createMockMomo);

router.get("/pay", mockMomoPage);

router.get("/success", mockMomoSuccess);

router.get("/fail", mockMomoFail);

export default router;