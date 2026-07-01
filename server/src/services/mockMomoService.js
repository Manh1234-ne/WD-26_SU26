import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

/**
 * Tạo payment mock MoMo
 */
export const createMockMomoPayment = async ({ bookingId }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Không tìm thấy booking");
  }

  let payment = await Payment.findOne({
    booking: bookingId,
  });

  if (!payment) {
    payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      amount: booking.finalAmount,
      method: "momo",
      status: "pending",
    });
  }

  const payUrl = `http://localhost:5000/api/mock-momo/pay?paymentId=${payment._id}`;

  return {
    payment,
    payUrl,
  };
};

/**
 * Xác nhận thanh toán Mock MoMo
 * Tương tự verifyVnPayReturnService
 */
export const verifyMockMomoPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found");
  }

  const booking = await Booking.findById(payment.booking);

  if (!booking) {
    throw new Error("Booking not found");
  }

  // tránh xử lý nhiều lần
  if (payment.status !== "pending") {
    return {
      payment,
      booking,
    };
  }

  payment.status = "paid";
  payment.transactionId = `MOCK_${Date.now()}`;
  payment.paidAt = new Date();

  booking.status = "confirmed";

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "booked" }
  );

  await payment.save();
  await booking.save();

  return {
    payment,
    booking,
  };
};

/**
 * Thanh toán thất bại
 */
export const failMockMomoPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new Error("Payment not found");
  }

  const booking = await Booking.findById(payment.booking);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (payment.status !== "pending") {
    return {
      payment,
      booking,
    };
  }

  payment.status = "failed";
  payment.note = "Mock payment failed";

  booking.status = "cancelled";

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "cancelled" }
  );

  await payment.save();
  await booking.save();

  return {
    payment,
    booking,
  };
};