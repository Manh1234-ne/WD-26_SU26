import express from "express";

import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingsByUser,
  cancelBooking,
  cancelBookingBeacon,
  completeBooking,
  markBookingPrinted,
  applyVoucherToBooking,
  updateBookingSeats,
  updateBookingCombos
} from "../controllers/bookingController.js";
import { protect, optionalProtect } from "../middlewares/authMiddleware.js";
import { isAdmin, isStaffOrAdmin } from "../middlewares/adminMiddleware.js";

const routerBooking = express.Router();

routerBooking.get("/", protect, isStaffOrAdmin, getAllBookings);
routerBooking.post("/", optionalProtect, createBooking);

routerBooking.get("/user/:userId", protect, getBookingsByUser);

routerBooking.get("/:id", protect, getBookingById);

routerBooking.patch("/:id/seats", updateBookingSeats);
routerBooking.patch("/:id/combos", updateBookingCombos);
routerBooking.patch("/:id/cancel", cancelBooking);

routerBooking.post("/:id/cancel-beacon", cancelBookingBeacon);

routerBooking.patch("/:id/print", protect, isStaffOrAdmin, markBookingPrinted);


routerBooking.patch(
  "/:id/complete",
  protect,
  isStaffOrAdmin,
  completeBooking
);

routerBooking.patch(
  "/:id/apply-voucher",
  applyVoucherToBooking
);

export default routerBooking;
