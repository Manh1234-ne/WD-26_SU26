import express from "express";

import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingsByUser,
  cancelBooking,
  cancelBookingBeacon,
  completeBooking,
  claimBookingCombo,
  markBookingComboPrinted,
  markBookingPrinted,
  applyVoucherToBooking,
  updateBookingSeats,
  updateBookingCombos,
  incrementPrintCount
} from "../controllers/bookingController.js";
import { protect, optionalProtect } from "../middlewares/authMiddleware.js";
import { isAdmin, isStaffOrAdmin } from "../middlewares/adminMiddleware.js";

const routerBooking = express.Router();

routerBooking.get("/", getAllBookings);
routerBooking.post("/", optionalProtect, createBooking);

routerBooking.get("/user/:userId", getBookingsByUser);

routerBooking.get("/:id", getBookingById);

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
  "/:id/claim-combo",
  protect,
  isStaffOrAdmin,
  claimBookingCombo
);

routerBooking.patch(
  "/:id/print-combo",
  protect,
  isStaffOrAdmin,
  markBookingComboPrinted
);

routerBooking.patch(
  "/:id/apply-voucher",
  applyVoucherToBooking
);

routerBooking.patch(
  "/:id/print",
  incrementPrintCount
);


export default routerBooking;
