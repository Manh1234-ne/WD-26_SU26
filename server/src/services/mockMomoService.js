import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

/**
 * Tạo payment mock MoMo
 */
export const createMockMomoPayment = async ({ bookingId }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Không tìm thấy booking");

  let payment = await Payment.findOne({ booking: bookingId });

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

  return { payment, payUrl };
};