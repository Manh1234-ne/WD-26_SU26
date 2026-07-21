import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import Voucher from "../models/Voucher.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { createBookingService } from "../services/bookingService.js";
import BookingCombo from "../models/BookingCombo.js";

import {
  releaseReservedStock,
} from "../services/inventoryService.js";

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
    const { user, showtime, seatIds, voucherCode, comboIds = [], } = req.body;

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
      comboIds,
    });

    return created(res, booking);
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("user")
    .populate("voucher")
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

  const combos = await BookingCombo.find({
    booking: booking._id,
}).populate("combo");

  return ok(res, {
    booking,
    seats,
    combos,
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

  if (booking.status === "cancelled") {
    return fail(res, 400, "Booking đã bị hủy");
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();

  await booking.save();

  await BookingSeat.updateMany(
    {
      booking: booking._id,
    },
    {
      status: "cancelled",
    }
  );

  const bookingCombos =
    await BookingCombo.find({
      booking: booking._id,
    });

  if (bookingCombos.length > 0) {
    const comboIds =
      bookingCombos.map((item) => ({
        combo: item.combo,
        quantity: item.quantity,
      }));

    await releaseReservedStock(comboIds);
  }

  return ok(res, booking);
});

export const applyVoucherToBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { voucherCode } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (booking.status !== "pending") {
    return fail(res, 400, "Booking không ở trạng thái chờ thanh toán");
  }

  if (!voucherCode) {
    booking.voucher = undefined;
    booking.discountAmount = 0;
    booking.finalAmount = booking.totalSeatPrice;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate("user")
      .populate({
        path: "showtime",
        populate: [
          { path: "movie" },
          { path: "cinema" },
          { path: "room" }
        ]
      });

    return ok(res, {
      booking: updatedBooking,
      voucher: null,
      discountAmount: 0,
      finalAmount: updatedBooking.finalAmount
    });
  }

  const voucher = await Voucher.findOne({
    code: voucherCode.toUpperCase(),
    isActive: true,
  });

  if (!voucher) {
    return fail(res, 404, "Voucher không tồn tại hoặc đã bị khóa");
  }

  const now = new Date();
  if (now < voucher.startDate) {
    return fail(res, 400, "Voucher chưa đến thời gian sử dụng");
  }
  if (now > voucher.endDate) {
    return fail(res, 400, "Voucher đã hết hạn");
  }

  if (
    voucher.usageLimit != null &&
    voucher.usedCount >= voucher.usageLimit
  ) {
    return fail(res, 400, "Voucher đã hết lượt sử dụng");
  }

  const pendingBookingCount = await Booking.countDocuments({
    voucher: voucher._id,
    status: "pending",
    _id: { $ne: booking._id },
  });

  if (
    voucher.usageLimit != null &&
    voucher.usedCount + pendingBookingCount >= voucher.usageLimit
  ) {
    return fail(res, 400, "Voucher sắp hết lượt sử dụng, vui lòng thử lại sau");
  }

  const userVoucherCount = await Booking.countDocuments({
    user: booking.user,
    voucher: voucher._id,
    status: { $ne: "cancelled" },
    _id: { $ne: booking._id },
  });

  if (userVoucherCount >= 1) {
    return fail(res, 400, "Mỗi tài khoản chỉ được sử dụng voucher này tối đa 1 lần");
  }

  if (voucher.code === "CHAOMUNGNGUOIMOI") {
    const hasPastBooking = await Booking.findOne({
      user: booking.user,
      status: { $in: ["confirmed", "completed"] },
      _id: { $ne: booking._id }
    });

    if (hasPastBooking) {
      return fail(res, 400, "Voucher này chỉ dành cho đơn hàng đầu tiên của tài khoản mới");
    }
  }

  if (booking.totalSeatPrice < voucher.minOrderAmount) {
    return fail(
      res,
      400,
      `Đơn hàng tối thiểu ${voucher.minOrderAmount} để sử dụng voucher`
    );
  }

  let discountAmount = 0;
  if (voucher.discountType === "percent") {
    discountAmount = (booking.totalSeatPrice * voucher.discountValue) / 100;
    if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
      discountAmount = voucher.maxDiscountAmount;
    }
  } else if (voucher.discountType === "fixed") {
    discountAmount = voucher.discountValue;
  }

  if (discountAmount > booking.totalSeatPrice) {
    discountAmount = booking.totalSeatPrice;
  }

  booking.voucher = voucher._id;
  booking.discountAmount = discountAmount;
  booking.finalAmount = booking.totalSeatPrice - discountAmount;

  await booking.save();

  const updatedBooking = await Booking.findById(booking._id)
    .populate("user")
    .populate("voucher")
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "cinema" },
        { path: "room" }
      ]
    });

  return ok(res, {
    booking: updatedBooking,
    voucher: updatedBooking.voucher,
    discountAmount: updatedBooking.discountAmount,
    finalAmount: updatedBooking.finalAmount
  });
});