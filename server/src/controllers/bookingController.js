import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import Voucher from "../models/Voucher.js";
import { asyncHandler } from "../utils/asynHandler.js";
import { createBookingService, updateBookingSeatsService } from "../services/bookingService.js";
import BookingCombo from "../models/BookingCombo.js";

import {
  releaseReservedStock,
} from "../services/inventoryService.js";
import {
  getComboPrice,
} from "../services/comboService.js";
import {
  reserveComboStock,
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

const canAccessBooking = (user, booking) => {
  if (!user || !booking) return false;
  if (["admin", "staff"].includes(user.role)) return true;
  const bookingUserId = booking.user?._id
    ? booking.user._id.toString()
    : booking.user
    ? booking.user.toString()
    : null;
  return Boolean(bookingUserId && bookingUserId === user._id.toString());
};

export const createBooking = asyncHandler(
  async (req, res) => {
    const {
      user,
      showtime,
      seatIds,
      voucherCode,
      comboIds = [],
      combos = [],
      customExpiresAt,
      isCounterSale,
      customerName,
      customerPhone,
      paymentMethod,
    } = req.body;

    const isStaff = ["admin", "staff"].includes(req.user?.role);
    const targetUser = isStaff ? (user || null) : (req.user?._id || user || null);

    if (isCounterSale && !isStaff) {
      return fail(res, 403, "Chỉ nhân viên mới có thể tạo vé bán tại quầy");
    }

    if ((!targetUser && !isCounterSale) || !showtime || !seatIds?.length) {
      return fail(
        res,
        400,
        "Vui lòng cung cấp đầy đủ thông tin"
      );
    }
    try {
      const booking = await createBookingService({
        user: targetUser,
        showtime,
        seatIds,
        voucherCode,
        comboIds,
        combos,
        customExpiresAt,
        isCounterSale: Boolean(isCounterSale),
        customerName: customerName || "Khách vãng lai",
        customerPhone: customerPhone || "",
        paymentMethod: paymentMethod || "cash",
        createdByStaff: req.user?._id || null,
      });

      return created(res, booking);
    } catch (error) {
      return fail(res, 400, error.message || "Không thể tạo booking");
    }
  });

export const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  const booking = await Booking.findById(id)
    .populate("user")
    .populate("printedBy", "fullName email")
    .populate("createdByStaff", "fullName email phone")
    .populate("voucher")
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "room" }
      ]
    });

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (!canAccessBooking(req.user, booking)) {
    return fail(res, 403, "Bạn không có quyền xem booking này");
  }

  const seats = await BookingSeat.find({
    booking: booking._id,
  }).populate("seat");

  const combos = await BookingCombo.find({
    booking: booking._id,
  }).populate("combo");

  return ok(res, {
    booking,
    seats,
    combos,
  });
});

export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user")
    .populate("createdByStaff", "fullName email phone")
    .populate("printedBy", "fullName email")
    .populate("voucher")
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "room" }
      ]
    })
    .sort({ createdAt: -1 });

  return ok(res, bookings);
});

export const getBookingsByUser = asyncHandler(async (req, res) => {
  const isStaff = ["admin", "staff"].includes(req.user.role);
  if (!isStaff && req.user._id.toString() !== req.params.userId) {
    return fail(res, 403, "Bạn không có quyền xem lịch sử đặt vé này");
  }

  const bookings = await Booking.find({
    user: req.params.userId,
  })
    .populate({
      path: "showtime",
      populate: [
        { path: "movie" },
        { path: "room" },
      ],
    })
    .sort({ createdAt: -1 });

  return ok(res, bookings);
});

export const completeBooking = asyncHandler(async (req, res) => {
  const currentBooking = await Booking.findById(req.params.id).populate("showtime");
  if (!currentBooking) return fail(res, 404, "Không tìm thấy booking");

  const startTime = currentBooking.showtime?.startTime
    ? new Date(currentBooking.showtime.startTime)
    : null;
  const checkInOpensAt = startTime
    ? new Date(startTime.getTime() - 30 * 60 * 1000)
    : null;

  if (checkInOpensAt && new Date() < checkInOpensAt) {
    return fail(res, 400, "Chỉ có thể soát vé trong vòng 30 phút trước giờ chiếu");
  }

  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, status: "confirmed" },
    {
      $set: {
        status: "completed",
        checkedInAt: new Date(),
        ...(req.user?._id ? { checkedInBy: req.user._id } : {}),
      },
    },
    { new: true, runValidators: true }
  );

  if (booking) return ok(res, booking);

  const existing = await Booking.findById(req.params.id);
  if (!existing) return fail(res, 404, "Không tìm thấy booking");
  if (existing.status === "completed") {
    return fail(res, 409, "Vé này đã được soát trước đó");
  }
  return fail(res, 400, "Chỉ vé đã thanh toán mới được soát");
});

export const claimBookingCombo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  const booking = await Booking.findById(id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (booking.status !== "completed") {
    if (booking.status === "confirmed") {
      return fail(res, 400, "Khách hàng cần soát vé vào rạp trước khi nhận combo");
    }
    return fail(res, 400, "Chỉ vé đã thanh toán và đã soát vé mới được nhận combo");
  }

  if (booking.comboStatus === "claimed") {
    return fail(res, 409, "Combo của đơn hàng này đã được nhận trước đó");
  }

  booking.comboStatus = "claimed";
  booking.comboClaimedAt = new Date();
  if (req.user?._id) {
    booking.comboClaimedBy = req.user._id;
  }

  await booking.save();

  return ok(res, booking);
});

export const markBookingComboPrinted = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  const booking = await Booking.findById(id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (!["confirmed", "completed"].includes(booking.status)) {
    return fail(res, 400, "Chỉ vé đã thanh toán mới được in");
  }

  if (booking.comboStatus !== "claimed") {
    return fail(res, 400, "Chỉ combo đã nhận mới được in");
  }

  booking.comboPrintStatus = "printed";
  booking.comboPrintedAt = new Date();
  if (req.user?._id) {
    booking.comboPrintedBy = req.user._id;
  }
  booking.comboPrintCount = (booking.comboPrintCount || 0) + 1;

  await booking.save();

  const populated = await Booking.findById(id).populate("comboPrintedBy", "fullName email");

  return ok(res, populated);
});

export const markBookingPrinted = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  const booking = await Booking.findById(id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (!["confirmed", "completed"].includes(booking.status)) {
    return fail(res, 400, "Chỉ vé đã thanh toán mới được in");
  }

  booking.printStatus = "printed";
  booking.printedAt = new Date();
  if (req.user?._id) {
    booking.printedBy = req.user._id;
  }
  booking.printCount = (booking.printCount || 0) + 1;

  await booking.save();

  const populated = await Booking.findById(id).populate("printedBy", "fullName email");

  return ok(res, populated);
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (booking.status === "cancelled") {
    return fail(res, 400, "Booking đã bị hủy");
  }

  if (booking.status !== "pending") {
    return fail(res, 400, "Chỉ có thể hủy booking đang chờ thanh toán");
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
export const cancelBookingBeacon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(204).end();
  }

  const booking = await Booking.findById(id);

  if (
    !booking ||
    booking.status === "cancelled" ||
    booking.status === "expired" ||
    booking.status === "completed" ||
    booking.status === "confirmed"
  ) {
    return res.status(204).end();
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "cancelled" }
  );

  const bookingCombos = await BookingCombo.find({ booking: booking._id });
  if (bookingCombos.length > 0) {
    const comboIds = bookingCombos.map((item) => ({
      combo: item.combo,
      quantity: item.quantity,
    }));
    try {
      await releaseReservedStock(comboIds);
    } catch (err) {
      console.error("[beacon] releaseReservedStock error:", err.message);
    }
  }

  console.log(`[beacon] Booking ${booking.bookingCode} cancelled via beacon/keepalive`);
  return res.status(204).end();
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

  const orderAmount =
    booking.totalSeatPrice +
    (booking.totalComboPrice || 0);


  if (!voucherCode) {
    booking.voucher = undefined;
    booking.discountAmount = 0;
    booking.finalAmount = orderAmount;
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

  if (orderAmount < voucher.minOrderAmount) {
    return fail(
      res,
      400,
      `Đơn hàng tối thiểu ${voucher.minOrderAmount} để sử dụng voucher`
    );
  }

  let discountAmount = 0;
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

  booking.voucher = voucher._id;
  booking.discountAmount = discountAmount;
  booking.finalAmount = orderAmount - discountAmount;

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

export const updateBookingSeats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { seatIds } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return fail(res, 400, "Danh sách ghế không hợp lệ");
  }

  const booking = await Booking.findById(id);

  if (!booking) {
    return fail(res, 404, "Không tìm thấy booking");
  }

  if (booking.status !== "pending") {
    return fail(res, 400, "Booking không thể chỉnh sửa");
  }

  if (booking.expiresAt && booking.expiresAt < new Date()) {
    return fail(res, 400, "Booking đã hết hạn");
  }

  const updatedBooking = await updateBookingSeatsService({
    booking,
    seatIds,
  });

  return ok(res, updatedBooking);
});



export const updateBookingCombos = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { combos } = req.body; // expect [{ combo: id, quantity }]

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return fail(res, 400, "ID booking không hợp lệ");
  }

  if (!Array.isArray(combos)) {
    return fail(res, 400, "Dữ liệu combó không hợp lệ");
  }

  const booking = await Booking.findById(id);
  if (!booking) return fail(res, 404, "Không tìm thấy booking");
  if (booking.status !== "pending") return fail(res, 400, "Booking không thể chỉnh sửa");
  if (booking.expiresAt && booking.expiresAt < new Date()) return fail(res, 400, "Booking đã hết hạn");

  // Validate combos and compute prices
  const { combos: resolvedCombos, totalComboPrice } = await getComboPrice(combos);

  // existing combos
  const existingBookingCombos = await BookingCombo.find({ booking: booking._id });
  const existingMap = {};
  existingBookingCombos.forEach((b) => {
    existingMap[b.combo.toString()] = b.quantity;
  });

  const newMap = {};
  resolvedCombos.forEach((c) => {
    newMap[c.combo.toString()] = c.quantity;
  });

  // prepare reserve and release lists based on delta
  const reserveList = [];
  const releaseList = [];

  // combos present in newMap
  for (const comboId of Object.keys(newMap)) {
    const newQty = newMap[comboId] || 0;
    const oldQty = existingMap[comboId] || 0;
    if (newQty > oldQty) reserveList.push({ combo: comboId, quantity: newQty - oldQty });
    else if (oldQty > newQty) releaseList.push({ combo: comboId, quantity: oldQty - newQty });
  }

  // combos removed entirely
  for (const comboId of Object.keys(existingMap)) {
    if (!newMap[comboId]) {
      releaseList.push({ combo: comboId, quantity: existingMap[comboId] });
    }
  }

  // Reserve additional stock first
  try {
    if (reserveList.length > 0) {
      await reserveComboStock(reserveList);
    }
  } catch (err) {
    return fail(res, 400, err.message || "Không đủ tồn kho cho combo");
  }

  // Release removed quantities
  if (releaseList.length > 0) {
    try {
      await releaseReservedStock(releaseList);
    } catch (err) {
      // log but don't fail the whole operation
      console.error("releaseReservedStock error:", err.message);
    }
  }

  // Replace BookingCombo documents
  await BookingCombo.deleteMany({ booking: booking._id });
  if (resolvedCombos.length > 0) {
    const bookingCombos = resolvedCombos.map((c) => ({
      booking: booking._id,
      combo: c.combo,
      quantity: c.quantity,
      unitPrice: c.price,
      totalPrice: c.price * c.quantity,
    }));

    await BookingCombo.insertMany(bookingCombos);
  }

  // update booking totals and re-apply voucher if present
  booking.totalComboPrice = totalComboPrice;

  let orderAmount = (booking.totalSeatPrice || 0) + (booking.totalComboPrice || 0);
  booking.discountAmount = 0;
  booking.finalAmount = orderAmount;

  if (booking.voucher) {
    const voucher = await Voucher.findOne({ _id: booking.voucher, isActive: true });
    if (voucher) {
      const now = new Date();
      try {
        if (now < voucher.startDate) throw new Error("Voucher chưa đến thời gian sử dụng");
        if (now > voucher.endDate) throw new Error("Voucher đã hết hạn");

        const pendingBookingCount = await Booking.countDocuments({ voucher: voucher._id, status: "pending", _id: { $ne: booking._id } });
        if (voucher.usageLimit != null && voucher.usedCount + pendingBookingCount >= voucher.usageLimit) throw new Error("Voucher sắp hết lượt sử dụng");

        const userVoucherCount = await Booking.countDocuments({ user: booking.user, voucher: voucher._id, status: { $ne: "cancelled" }, _id: { $ne: booking._id } });
        if (userVoucherCount >= 1) throw new Error("Mỗi tài khoản chỉ được sử dụng voucher này tối đa 1 lần");

        if (voucher.code === "CHAOMUNGNGUOIMOI") {
          const hasPastBooking = await Booking.findOne({ user: booking.user, status: { $in: ["confirmed", "completed"] }, _id: { $ne: booking._id } });
          if (hasPastBooking) throw new Error("Voucher này chỉ dành cho đơn hàng đầu tiên của tài khoản mới");
        }

        if (orderAmount < voucher.minOrderAmount) throw new Error(`Đơn hàng tối thiểu ${voucher.minOrderAmount} để sử dụng voucher`);

        let discountAmount = 0;
        if (voucher.discountType === "percent") {
          discountAmount = (orderAmount * voucher.discountValue) / 100;
          if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) discountAmount = voucher.maxDiscountAmount;
        } else if (voucher.discountType === "fixed") {
          discountAmount = voucher.discountValue;
        }
        if (discountAmount > orderAmount) discountAmount = orderAmount;

        booking.discountAmount = discountAmount;
        booking.finalAmount = orderAmount - discountAmount;
      } catch (err) {
        // if voucher invalid after combo change, remove voucher
        booking.voucher = undefined;
        booking.discountAmount = 0;
        booking.finalAmount = orderAmount;
      }
    }
  }

  await booking.save();

  const updatedBooking = await Booking.findById(booking._id)
    .populate("user")
    .populate("voucher")
    .populate({ path: "showtime", populate: [{ path: "movie" }, { path: "room" }, { path: "cinema" }] });

  const bookingCombos = await BookingCombo.find({ booking: booking._id }).populate("combo");

  return ok(res, { booking: updatedBooking, combos: bookingCombos });
});
