import express from "express";

import {
  createBooking,
  getBookingById,
  getBookingsByUser,
  cancelBooking,
  completeBooking,
} from "../controllers/bookingController.js";

const routerBooking = express.Router();

routerBooking.post("/", createBooking);

routerBooking.get(
  "/user/:userId",
  getBookingsByUser
);

routerBooking.get("/:id", getBookingById);

routerBooking.patch(
  "/:id/cancel",
  cancelBooking
);

routerBooking.patch(
  "/:id/complete",
  completeBooking
);

export default routerBooking;