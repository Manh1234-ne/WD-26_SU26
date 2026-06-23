import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import Showtime from "../models/Showtime.js";
import Seat from "../models/Seat.js";
import Voucher from "../models/Voucher.js";

export const createBookingService = async ({
  user,
  showtime,
  seatIds,
  voucherCode,
}) => {
  const showtimeExists = await Showtime.findById(showtime);

  if (!showtimeExists) {
    throw new Error("Không tìm thấy suất chiếu");
  }

  const seats = await Seat.find({
    _id: { $in: seatIds },
    room: showtimeExists.room,
    isActive: true,
  });

  if (seats.length !== seatIds.length) {
    throw new Error("Ghế không hợp lệ");
  }

  const bookedSeats = await BookingSeat.find({
    showtime,
    seat: { $in: seatIds },
    status: { $in: ["held", "booked"] },
  });

  if (bookedSeats.length > 0) {
    throw new Error("Ghế đã được đặt");
  }

  const totalSeatPrice = seats.reduce(
    (sum, seat) =>
      sum +
      showtimeExists.basePrice *
        seat.priceMultiplier,
    0
  );

  let voucher = null;
  let discountAmount = 0;
  let finalAmount = totalSeatPrice;

  if (voucherCode) {
    voucher = await Voucher.findOne({
      code: voucherCode.toUpperCase(),
      isActive: true,
    });

    if (!voucher) {
      throw new Error(
        "Voucher không tồn tại hoặc đã bị khóa"
      );
    }

    const now = new Date();

    if (now < voucher.startDate) {
      throw new Error(
        "Voucher chưa đến thời gian sử dụng"
      );
    }

    if (now > voucher.endDate) {
      throw new Error("Voucher đã hết hạn");
    }

    if (
      voucher.usageLimit &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new Error(
        "Voucher đã hết lượt sử dụng"
      );
    }

    if (
      totalSeatPrice <
      voucher.minOrderAmount
    ) {
      throw new Error(
        `Đơn hàng tối thiểu ${voucher.minOrderAmount} để sử dụng voucher`
      );
    }

    // Percent
    if (
      voucher.discountType === "percent"
    ) {
      discountAmount =
        (totalSeatPrice *
          voucher.discountValue) /
        100;

      if (
        voucher.maxDiscountAmount &&
        discountAmount >
          voucher.maxDiscountAmount
      ) {
        discountAmount =
          voucher.maxDiscountAmount;
      }
    }

    if (
      voucher.discountType === "fixed"
    ) {
      discountAmount =
        voucher.discountValue;
    }

    if (
      discountAmount >
      totalSeatPrice
    ) {
      discountAmount =
        totalSeatPrice;
    }

    finalAmount =
      totalSeatPrice - discountAmount;
  }

  const booking = await Booking.create({
    bookingCode: `BK${Date.now()}`,
    user,
    showtime,
    voucher: voucher?._id,
    totalSeatPrice,
    discountAmount,
    finalAmount,

    status: "pending",

    expiresAt: new Date(
      Date.now() + 10 * 60 * 1000
    ),
  });

  const bookingSeats = seats.map(
    (seat) => ({
      booking: booking._id,
      showtime,

      seat: seat._id,

      seatCode: seat.code,
      seatType: seat.type,

      price:
        showtimeExists.basePrice *
        seat.priceMultiplier,

      status: "held",
    })
  );

  await BookingSeat.insertMany(
    bookingSeats
  );

  return booking;
};