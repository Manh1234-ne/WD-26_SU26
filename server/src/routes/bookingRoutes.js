import express from "express";

import {
  createBooking,
  getBookingById,
  getBookingsByUser,
  cancelBooking,
  completeBooking,
  applyVoucherToBooking,
} from "../controllers/bookingController.js";

const routerBooking = express.Router();

routerBooking.post("/", createBooking);

routerBooking.get("/user/:userId", getBookingsByUser);

routerBooking.get("/:id", getBookingById);

routerBooking.patch("/:id/cancel", cancelBooking);

routerBooking.patch(
  "/:id/complete",
  completeBooking
);

routerBooking.patch(
  "/:id/apply-voucher",
  applyVoucherToBooking
);

export default routerBooking;
