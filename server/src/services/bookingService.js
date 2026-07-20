import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";
import Showtime from "../models/Showtime.js";
import Seat from "../models/Seat.js";
import Voucher from "../models/Voucher.js";
import { getComboPrice } from "./comboService.js";

export const createBookingService = async ({
  user,
  showtime,
  seatIds,
  voucherCode,
  comboIds = [],
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
      sum + showtimeExists.basePrice * seat.priceMultiplier,
    0
  );

  const {
    combos,
    totalComboPrice,
  } = await getComboPrice(comboIds);

  const orderAmount = totalSeatPrice + totalComboPrice;

  let voucher = null;
  let discountAmount = 0;
  let finalAmount = orderAmount;

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
      throw new Error(
        "Voucher đã hết hạn"
      );
    }

    if (
      voucher.usageLimit != null &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new Error(
        "Voucher đã hết lượt sử dụng"
      );
    }

    const pendingBookingCount =
      await Booking.countDocuments({
        voucher: voucher._id,
        status: "pending",
      });

    if (
      voucher.usageLimit != null &&
      voucher.usedCount + pendingBookingCount >=
        voucher.usageLimit
    ) {
      throw new Error(
        "Voucher sắp hết lượt sử dụng"
      );
    }

    const userVoucherCount =
      await Booking.countDocuments({
        user,
        voucher: voucher._id,
        status: {
          $ne: "cancelled",
        },
      });

    if (userVoucherCount >= 1) {
      throw new Error(
        "Mỗi tài khoản chỉ được sử dụng voucher này một lần"
      );
    }

    if (
      voucher.code ===
      "CHAOMUNGNGUOIMOI"
    ) {
      const oldBooking =
        await Booking.findOne({
          user,
          status: {
            $in: [
              "confirmed",
              "completed",
            ],
          },
        });

      if (oldBooking) {
        throw new Error(
          "Voucher chỉ dành cho khách hàng mới"
        );
      }
    }

    if (
      orderAmount <
      voucher.minOrderAmount
    ) {
      throw new Error(
        `Đơn hàng tối thiểu ${voucher.minOrderAmount}`
      );
    }

    if (
      voucher.discountType ===
      "percent"
    ) {
      discountAmount =
        (orderAmount *
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
      voucher.discountType ===
      "fixed"
    ) {
      discountAmount =
        voucher.discountValue;
    }

    if (
      discountAmount >
      orderAmount
    ) {
      discountAmount =
        orderAmount;
    }

    finalAmount =
      orderAmount -
      discountAmount;
  }

  const booking =
    await Booking.create({
      bookingCode: `BK${Date.now()}`,
      user,
      showtime,

      voucher: voucher?._id,

      totalSeatPrice,
      discountAmount,
      finalAmount,

      status: "pending",

      expiresAt: new Date(
        Date.now() +
          10 * 60 * 1000
      ),
    });

  const bookingSeats =
    seats.map((seat) => ({
      booking: booking._id,
      showtime,
      seat: seat._id,
      seatCode: seat.code,
      seatType: seat.type,
      price: showtimeExists.basePrice * seat.priceMultiplier,
      status: "held",
    }));

  await BookingSeat.insertMany(
    bookingSeats
  );

  if (combos.length > 0) {
    const bookingCombos =
      combos.map((combo) => ({
        booking: booking._id,
        combo: combo._id,
        quantity: combo.quantity,
        unitPrice: combo.price,
        totalPrice:
          combo.price *
          combo.quantity,
      }));

    await BookingCombo.insertMany(
      bookingCombos
    );
  }

  return booking;
};