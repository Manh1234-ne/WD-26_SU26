import { asyncHandler } from "../utils/asynHandler.js";

import {
  createVnPayUrlService,
  verifyVnPayReturnService,
} from "../services/paymentService.js";

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";

import { generateQR, generatePlainQR } from "../utils/qrCode.js";
import { sendMail } from "../utils/sendMail.js";
// import User from "../models/User.js";

/**
 * =========================
 * RESPONSE HELPER
 * =========================
 */
const ok = (res, data) =>
  res.status(200).json({ success: true, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

/**
 * =========================
 * 1. CREATE PAYMENT URL
 * =========================
 */
export const createPaymentUrl = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return fail(res, 400, "Thiếu bookingId");
  }

  const ipAddr =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  const result = await createVnPayUrlService({
    bookingId,
    ipAddr,
  });

  return ok(res, result);
});

/**
 * =========================
 * 2. VNPay RETURN
 * =========================
 */
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnp_Params = req.query;

  if (!vnp_Params || Object.keys(vnp_Params).length === 0) {
    return fail(res, 400, "Không có dữ liệu VNPay");
  }

  // verify payment
  const result = await verifyVnPayReturnService(vnp_Params);

  console.log("VNPay RETURN RESULT:", result);

  if (result?.booking) {
    // 🔥 POPULATE FULL DATA
    const booking = await Booking.findById(result.booking._id)
      .populate("user")
      .populate({
        path: "showtime",
        populate: [
          {
            path: "movie",
          },
          {
            path: "cinema",
          },
          {
            path: "room",
          },
        ],
      });

    await handleSendTicket(booking);
  }

  return ok(res, {
    message: "VNPay xác nhận thanh toán",
    ...result,
  });
});

/**
 * =========================
 * 3. VNPay IPN
 * =========================
 */
export const vnpayIpn = asyncHandler(async (req, res) => {
  try {
    await verifyVnPayReturnService(req.query);

    return res.status(200).json({
      RspCode: "00",
      Message: "Confirm Success",
    });
  } catch (err) {
    return res.status(200).json({
      RspCode: "97",
      Message: err.message,
    });
  }
});

/**
 * =========================
 * 4. GET PAYMENT BY BOOKING
 * =========================
 */
export const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const payment = await Payment.findOne({ booking: bookingId });

  if (!payment) {
    return fail(res, 404, "Không tìm thấy payment");
  }

  return ok(res, payment);
});

/**
 * =========================
 * 5. MOCK MOMO SUCCESS
 * =========================
 */
export const mockMomoSuccess = async (req, res) => {
  const { paymentId } = req.query;

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.send("Payment not found");

  payment.status = "paid";
  payment.transactionId = "MOCK_" + Date.now();
  payment.paidAt = new Date();
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  booking.status = "confirmed";
  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "booked" }
  );

  await handleSendTicket(
    await Booking.findById(booking._id)
      .populate("user")
      .populate({
        path: "showtime",
        populate: [
          {
            path: "movie",
          },
          {
            path: "cinema",
          },
          {
            path: "room",
          },
        ],
      })
  );

  return res.redirect(
    `http://localhost:5173/payment-success?status=success&bookingId=${booking._id}`
  );
};

/**
 * =========================
 * 6. MOCK MOMO FAIL
 * =========================
 */
export const mockMomoFail = async (req, res) => {
  const { paymentId } = req.query;

  const payment = await Payment.findById(paymentId);
  if (!payment) return res.send("Payment not found");

  payment.status = "failed";
  payment.note = "Mock payment failed";
  await payment.save();

  const booking = await Booking.findById(payment.booking);

  if (booking && booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
    booking.status = "expired";
    booking.cancelledAt = new Date();
    await booking.save();

    await BookingSeat.updateMany(
      { booking: booking._id },
      { status: "cancelled" }
    );
  }

  return res.redirect(
    `http://localhost:5173/payment-success?status=fail&bookingId=${booking?._id}`
  );
};

/**
 * =========================
 * 7. SEND TICKET EMAIL
 * =========================
 */
const handleSendTicket = async (booking) => {
  try {
    console.log("START SEND TICKET:", booking._id);

    const seats = await BookingSeat.find({ booking: booking._id });

    const ticketData = {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,

      movie: booking.showtime?.movie?.title,
      cinema: booking.showtime?.cinema?.name,
      room: booking.showtime?.room?.name,
      time: booking.showtime?.startTime,

      seats: seats.map((s) => s.seatCode),
    };

    const qr = await generateQR(ticketData);
    const qrBase64 = qr.replace(
      /^data:image\/png;base64,/,
      ""
    );

    const comboData = {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      movie: booking.showtime?.movie?.title,
      cinema: booking.showtime?.cinema?.name,
      room: booking.showtime?.room?.name,
      time: booking.showtime?.startTime,
      type: "combo",
    };

    const qrCombo = await generateQR(comboData);
    const qrComboBase64 = qrCombo.replace(
      /^data:image\/png;base64,/,
      ""
    );

    const user = booking.user;

    if (!user) {
      console.log("USER NOT FOUND");
      return;
    }

    console.log("SENDING EMAIL TO:", user.email);

    // include combo list (if any) in the email body
    const bookingCombos = await BookingCombo.find({ booking: booking._id }).populate("combo");
    let comboHtml = "";
    if (bookingCombos && bookingCombos.length > 0) {
      const combosList = bookingCombos
        .map((c) => `<li>${c.combo?.name || ""} (x${c.quantity})</li>`)
        .join("");
      comboHtml = `
        <h3 style="margin-top: 15px; margin-bottom: 8px;">🍿 Combo đã đặt:</h3>
        <ul style="margin-top: 0; padding-left: 20px; color: #374151;">
          ${combosList}
        </ul>
      `;
    }

    await sendMail({
      to: user.email,
      subject: "🎬 Vé xem phim đã xác nhận",

      attachments: [
        {
          filename: "ticket-qr.png",
          content: qrBase64,
          encoding: "base64",
          cid: "ticketqr",
        },
        {
          filename: "combo-qr.png",
          content: qrComboBase64,
          encoding: "base64",
          cid: "comboqr",
        },
      ],

      html: `
        <div style="font-family:Arial">
          <h2>🎉 Đặt vé thành công</h2>

          <p><b>Mã booking:</b> ${booking.bookingCode || booking._id}</p>
          <p><b>Phim:</b> ${booking.showtime?.movie?.title || ""}</p>
          <p><b>Rạp:</b> ${booking.showtime?.cinema?.name || ""}</p>
          <p><b>Phòng:</b> ${booking.showtime?.room?.name || ""}</p>
          <p><b>Giờ chiếu:</b> ${booking.showtime?.startTime || ""}</p>

          <p><b>Ghế:</b> ${seats.map((s) => s.seatCode).join(", ")}</p>

          ${comboHtml}

          <div style="margin-top: 20px;">
            <div style="display: inline-block; text-align: center; margin-right: 30px; vertical-align: top;">
              <h3 style="margin-bottom: 8px;">🎫 Vé xem phim (Vào cổng)</h3>
              <img src="cid:ticketqr" width="180"/>
              <p style="font-size: 12px; color: #64748b; margin-top: 4px; max-width: 180px;">Dùng để quét soát vé vào phòng chiếu</p>
            </div>
            <div style="display: inline-block; text-align: center; vertical-align: top;">
              <h3 style="margin-bottom: 8px;">🍿 QR Combo (Nhận đồ ăn)</h3>
              <img src="cid:comboqr" width="180"/>
              <p style="font-size: 12px; color: #64748b; margin-top: 4px; max-width: 180px;">Dùng để quét nhận đồ ăn nước uống tại quầy</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("EMAIL SENT SUCCESS");
  } catch (err) {
    console.error("SEND TICKET ERROR:", err);
  }
};