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
  updateBookingSeats
} from "../controllers/bookingController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const routerBooking = express.Router();

routerBooking.get("/", getAllBookings);
routerBooking.post("/", createBooking);

routerBooking.get("/user/:userId", getBookingsByUser);

routerBooking.get("/:id", getBookingById);

routerBooking.patch("/:id/seats", updateBookingSeats);
routerBooking.patch("/:id/cancel", cancelBooking);

routerBooking.post("/:id/cancel-beacon", cancelBookingBeacon);

routerBooking.patch("/:id/print", protect, isAdmin, markBookingPrinted);


routerBooking.patch(
  "/:id/complete",
  protect,
  isAdmin,
  completeBooking
);

routerBooking.patch(
  "/:id/apply-voucher",
  applyVoucherToBooking
);


export default routerBooking;
