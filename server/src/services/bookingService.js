import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";
import Showtime from "../models/Showtime.js";
import Seat from "../models/Seat.js";
import Voucher from "../models/Voucher.js";

import {
  getComboPrice,
} from "./comboService.js";

import {
  reserveComboStock,
  deductReservedStock,
} from "./inventoryService.js";
export const createBookingService = async ({
  user,
  showtime,
  seatIds,
  voucherCode,
  comboIds = [],
  combos = [],
  customExpiresAt,
  isCounterSale = false,
  customerName = "Khách vãng lai",
  customerPhone = "",
  paymentMethod = "cash",
  createdByStaff = null,
}) => {
  console.log("CREATE BOOKING CALLED", seatIds, "isCounterSale:", isCounterSale);
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

  const activeBookings = await Booking.find({
    showtime,
    $or: [
      { status: { $in: ["confirmed", "completed"] } },
      { status: "pending", expiresAt: { $gt: new Date() } }
    ]
  }).select("_id");
  const activeBookingIds = activeBookings.map((b) => b._id);
  const unavailableSeats = await BookingSeat.find({
    showtime,
    seat: { $in: seatIds },
    booking: { $in: activeBookingIds },
    status: { $in: ["booked", "held"] },
  });

  if (unavailableSeats.length > 0) {
    throw new Error("Ghế đã được đặt hoặc đang được giữ bởi người khác");
  }

  const totalSeatPrice = seats.reduce(
    (sum, seat) =>
      sum + showtimeExists.basePrice * seat.priceMultiplier,
    0
  );

  // Normalize combos parameter (could be [{combo, quantity}] or [comboId])
  const rawComboList = combos.length > 0 ? combos : comboIds;
  const normalizedComboItems = rawComboList.map((item) =>
    typeof item === "object" && item?.combo
      ? { combo: item.combo, quantity: item.quantity || 1 }
      : { combo: item, quantity: 1 }
  );

  const {
    combos: resolvedCombos,
    totalComboPrice,
  } = await getComboPrice(normalizedComboItems);

  if (normalizedComboItems.length > 0) {
    await reserveComboStock(normalizedComboItems);
  }

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
      throw new Error("Voucher không tồn tại hoặc đã bị khóa");
    }

    const now = new Date();
    if (now < voucher.startDate) {
      throw new Error("Voucher chưa đến thời gian sử dụng");
    }
    if (now > voucher.endDate) {
      throw new Error("Voucher đã hết hạn");
    }

    if (
      voucher.usageLimit != null &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new Error("Voucher đã hết lượt sử dụng");
    }

    const pendingBookingCount = await Booking.countDocuments({
      voucher: voucher._id,
      status: "pending",
    });

    if (
      voucher.usageLimit != null &&
      voucher.usedCount + pendingBookingCount >= voucher.usageLimit
    ) {
      throw new Error("Voucher sắp hết lượt sử dụng");
    }

    if (user) {
      const userVoucherCount = await Booking.countDocuments({
        user,
        voucher: voucher._id,
        status: { $ne: "cancelled" },
      });

      if (userVoucherCount >= 1) {
        throw new Error("Mỗi tài khoản chỉ được sử dụng voucher này một lần");
      }

      if (voucher.code === "CHAOMUNGNGUOIMOI") {
        const oldBooking = await Booking.findOne({
          user,
          status: { $in: ["confirmed", "completed"] },
        });

        if (oldBooking) {
          throw new Error("Voucher chỉ dành cho khách hàng mới");
        }
      }
    }

    if (orderAmount < voucher.minOrderAmount) {
      throw new Error(`Đơn hàng tối thiểu ${voucher.minOrderAmount}`);
    }

    if (voucher.discountType === "percent") {
      discountAmount = (orderAmount * voucher.discountValue) / 100;
      if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
        discountAmount = voucher.maxDiscountAmount;
      }
    } else if (voucher.discountType === "fixed") {
      discountAmount = voucher.discountValue;
    }

    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    finalAmount = orderAmount - discountAmount;
  }

  const maxExpiresAt = Date.now() + 5 * 60 * 1000;
  const resolvedExpiresAt =
    customExpiresAt &&
      customExpiresAt > Date.now() &&
      customExpiresAt <= maxExpiresAt
      ? new Date(customExpiresAt)
      : new Date(maxExpiresAt);

  // Counter sale paid by cash or counter payment -> confirmed immediately
  const isAutoConfirmed = isCounterSale && (paymentMethod === "cash" || paymentMethod === "vnpay");
  const bookingStatus = isAutoConfirmed ? "confirmed" : "pending";
  const seatStatus = isAutoConfirmed ? "booked" : "held";

  const booking = await Booking.create({
    bookingCode: `BK${Date.now()}`,
    user: user || undefined,
    isCounterSale,
    customerName: customerName || "Khách vãng lai",
    customerPhone: customerPhone || "",
    paymentMethod: paymentMethod || "cash",
    paymentStatus: isAutoConfirmed ? "paid" : "unpaid",
    createdByStaff: createdByStaff || undefined,
    printedBy: isAutoConfirmed ? createdByStaff || undefined : undefined,
    printedAt: isAutoConfirmed ? new Date() : undefined,
    printStatus: isAutoConfirmed ? "printed" : "not_printed",
    showtime,
    voucher: voucher?._id,
    totalSeatPrice,
    totalComboPrice,
    discountAmount,
    finalAmount,
    status: bookingStatus,
    expiresAt: resolvedExpiresAt,
  });

  if (isAutoConfirmed && voucher) {
    await Voucher.findByIdAndUpdate(voucher._id, { $inc: { usedCount: 1 } });
  }

  const bookingSeats = seats.map((seat) => ({
    booking: booking._id,
    showtime,
    seat: seat._id,
    seatCode: seat.code,
    seatType: seat.type,
    price: showtimeExists.basePrice * seat.priceMultiplier,
    status: seatStatus,
  }));

  await BookingSeat.insertMany(bookingSeats);

  if (resolvedCombos.length > 0) {
    const bookingCombos = resolvedCombos.map((combo) => ({
      booking: booking._id,
      combo: combo.combo,
      quantity: combo.quantity,
      unitPrice: combo.price,
      totalPrice: combo.price * combo.quantity,
    }));

    await BookingCombo.insertMany(bookingCombos);

    if (isAutoConfirmed) {
      try {
        await deductReservedStock(normalizedComboItems);
      } catch (err) {
        console.error("[createBookingService] deductReservedStock error:", err.message);
      }
    }
  }

  return booking;
};
export const updateBookingSeatsService = async ({
  booking,
  seatIds,
}) => {
    console.log("UPDATE SEATS CALLED", seatIds);
  const showtime = await Showtime.findById(booking.showtime);

  if (!showtime) {
    throw new Error("Không tìm thấy suất chiếu");
  }

  // Lấy các ghế mới
  const seats = await Seat.find({
    _id: { $in: seatIds },
    room: showtime.room,
    isActive: true,
  });

  if (seats.length !== seatIds.length) {
    throw new Error("Ghế không hợp lệ");
  }

  // Ghế hiện tại của booking
  const currentBookingSeats = await BookingSeat.find({
    booking: booking._id,
    status: { $ne: "cancelled" },
  });

  const currentSeatIds = currentBookingSeats.map((s) =>
    s.seat.toString()
  );

  // Ghế cần thêm
  const addSeatIds = seatIds.filter(
    (id) => !currentSeatIds.includes(id)
  );

  // Ghế cần bỏ
  const removeSeatIds = currentSeatIds.filter(
    (id) => !seatIds.includes(id)
  );

  /**
   * Kiểm tra ghế mới có bị người khác giữ không
   */
  if (addSeatIds.length > 0) {
    const activeBookings = await Booking.find({
      showtime: booking.showtime,
      _id: { $ne: booking._id },
      $or: [
        {
          status: {
            $in: ["confirmed", "completed"],
          },
        },
        {
          status: "pending",
          expiresAt: { $gt: new Date() },
        },
      ],
    }).select("_id");

    const activeBookingIds = activeBookings.map((b) => b._id);

    const unavailableSeats = await BookingSeat.find({
      showtime: booking.showtime,
      booking: {
        $in: activeBookingIds,
      },
      seat: {
        $in: addSeatIds,
      },
      status: {
        $in: ["held", "booked"],
      },
    });

    if (unavailableSeats.length > 0) {
      throw new Error(
        "Ghế đã được người khác giữ hoặc đã đặt"
      );
    }
  }

  /**
   * Huỷ các ghế bỏ chọn
   */
  if (removeSeatIds.length > 0) {
  console.log("REMOVE SEATS:", removeSeatIds);

  await BookingSeat.deleteMany({
    booking: booking._id,
    seat: {
      $in: removeSeatIds
    }
  });
}

  /**
   * Thêm ghế mới
   */
  // Thêm ghế mới
// Thêm ghế mới
if (addSeatIds.length > 0) {
  const addSeats = seats.filter((s) =>
    addSeatIds.includes(s._id.toString())
  );


  const newBookingSeats = addSeats.map((seat) => ({
    booking: booking._id,
    showtime: booking.showtime,
    seat: seat._id,
    seatCode: seat.code,
    seatType: seat.type,
    price: showtime.basePrice * seat.priceMultiplier,
    status: "held",
  }));

  await BookingSeat.insertMany(newBookingSeats);
}
  /**
   * Tính lại tiền ghế
   */
  booking.totalSeatPrice = seats.reduce(
    (sum, seat) =>
      sum +
      showtime.basePrice *
      seat.priceMultiplier,
    0
  );

  booking.finalAmount =
    booking.totalSeatPrice +
    (booking.totalComboPrice || 0) -
    (booking.discountAmount || 0);

  if (booking.finalAmount < 0) {
    booking.finalAmount = 0;
  }

  await booking.save();

  return await Booking.findById(booking._id)
    .populate("user")
    .populate("voucher")
    .populate({
      path: "showtime",
      populate: [
        {
          path: "movie",
        },
        {
          path: "room",
        },
      ],
    });
};