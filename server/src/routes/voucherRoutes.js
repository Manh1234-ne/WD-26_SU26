import express from "express";

import {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
} from "../controllers/voucherController.js";

const routerVoucher =
  express.Router();

routerVoucher.get(
  "/",
  getAllVouchers
);

routerVoucher.get(
  "/:id",
  getVoucherById
);

routerVoucher.post(
  "/",
  createVoucher
);

routerVoucher.post(
  "/validate",
  validateVoucher
);

routerVoucher.put(
  "/:id",
  updateVoucher
);

routerVoucher.delete(
  "/:id",
  deleteVoucher
);

export default routerVoucher;