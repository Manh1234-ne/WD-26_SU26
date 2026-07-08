import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { createBookingService } from "../services/bookingService.js";

const ok = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

const created = (res, data, message = "Tạo thành công") =>
  res.status(201).json({
    success: true,
    message,
    data,
  });

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const createBooking = asyncHandler(
  async (req, res) => {
    const { user, showtime, seatIds, voucherCode } = req.body;

    if (!user || !showtime || !seatIds?.length) {
      return fail(
        res,
        400,
        "Vui lòng cung cấp đầy đủ thông tin"
      );
    }

    const booking = await createBookingService({
      user,
      showtime,
      seatIds,
      voucherCode,
    });

    return created(res, booking);
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("user")
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "cinema" },
        { path: "room" }
      ]
    });

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  const seats = await BookingSeat.find({
    booking: booking._id,
  });

  return ok(res, {
    booking,
    seats,
  });
});

export const getBookingsByUser = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    user: req.params.userId,
  })
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "cinema" },
      ],
    })
    .sort({ createdAt: -1 });

  return ok(res, bookings);
});

export const completeBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (booking.status !== "confirmed") {
    return fail(
      res,
      400,
      "Chỉ booking đã thanh toán mới được hoàn thành"
    );
  }

  booking.status = "completed";

  await booking.save();

  return ok(res, booking);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();

  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "cancelled" }
  );

  return ok(res, booking);
});