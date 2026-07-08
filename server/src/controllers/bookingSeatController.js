import BookingSeat from "../models/BookingSeat.js";
import Showtime from "../models/Showtime.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const getAllBookingSeats = asyncHandler(
  async (req, res) => {
    const bookingSeats = await BookingSeat.find()
      .populate("booking")
      .populate("showtime")
      .populate("seat")
      .sort({ createdAt: -1 });

    return ok(res, bookingSeats);
  }
);

export const getBookingSeatById = asyncHandler(
  async (req, res) => {
    const bookingSeat = await BookingSeat.findById(
      req.params.id
    )
      .populate("booking")
      .populate("showtime")
      .populate("seat");

    if (!bookingSeat) {
      return fail(
        res,
        404,
        "Không tìm thấy booking seat"
      );
    }

    return ok(res, bookingSeat);
  }
);

export const getBookingSeatsByShowtime =
  asyncHandler(async (req, res) => {
    const showtime = await Showtime.findById(
      req.params.showtimeId
    );

    if (!showtime) {
      return fail(
        res,
        404,
        "Không tìm thấy suất chiếu"
      );
    }

    const bookingSeats =
      await BookingSeat.find({
        showtime: req.params.showtimeId,
      })
        .populate("seat")
        .sort({ seatCode: 1 });

    return ok(res, bookingSeats);
  });

export const getOccupiedSeats =
  asyncHandler(async (req, res) => {
    const occupiedSeats =
      await BookingSeat.find({
        showtime: req.params.showtimeId,
        status: "booked",
      })
        .select(
          "seat seatCode seatType status price"
        )
        .sort({ seatCode: 1 });

    return ok(res, occupiedSeats);
  });