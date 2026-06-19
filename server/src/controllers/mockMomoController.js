
import {
  createMockMomoPayment,
  verifyMockMomoPayment,
  failMockMomoPayment,
} from "../services/mockMomoService.js";

import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import QRCode from "qrcode";

import { generateQR } from "../utils/qrCode.js";
import { sendMail } from "../utils/sendMail.js";
import User from "../models/User.js";

/**
 * Tạo payment mock momo
 */
export const createMockMomo = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const result = await createMockMomoPayment({
      bookingId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * Trang thanh toán mock
 */
export const mockMomoPage = async (req, res) => {
  const { paymentId } = req.query;

  const payUrl =
    `http://localhost:5000/api/mock-momo/success?paymentId=${paymentId}`;

  const qrImage = await QRCode.toDataURL(payUrl);

  res.send(`
    <html>
      <body style="text-align:center;font-family:Arial;padding-top:40px">

        <h2>MOCK MOMO PAYMENT</h2>

        <p>Scan QR để thanh toán</p>

        <img src="${qrImage}" width="250"/>

        <br/><br/>

        <a href="/api/mock-momo/success?paymentId=${paymentId}">
          <button style="padding:10px;background:green;color:white;">
            SUCCESS
          </button>
        </a>

        <a href="/api/mock-momo/fail?paymentId=${paymentId}">
          <button style="padding:10px;background:red;color:white;">
            FAIL
          </button>
        </a>

      </body>
    </html>
  `);
};

/**
 * THANH TOÁN THÀNH CÔNG
 */
export const mockMomoSuccess = async (req, res) => {
  try {
    const { paymentId } = req.query;

    const { booking } =
      await verifyMockMomoPayment(paymentId);

    const fullBooking = await Booking.findById(booking._id)
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

    const seats = await BookingSeat.find({
      booking: booking._id,
    });

    const ticketData = {
      bookingId: fullBooking._id,
      bookingCode: fullBooking.bookingCode,

      movie: fullBooking.showtime?.movie?.title,
      cinema: fullBooking.showtime?.cinema?.name,
      room: fullBooking.showtime?.room?.name,
      time: fullBooking.showtime?.startTime,

      seats: seats.map((s) => s.seatCode),
    };

    const qr = await generateQR(ticketData);
    const qrBase64 = qr.replace(
      /^data:image\/png;base64,/,
      ""
    );

    const user = fullBooking.user;

    if (user) {
      await sendMail({
        to: user.email,
        subject: "🎬 Vé xem phim của bạn đã được xác nhận",

        attachments: [
          {
            filename: "ticket-qr.png",
            content: qrBase64,
            encoding: "base64",
            cid: "ticketqr",
          },
        ],

        html: `
<div style="font-family:Arial">
  <h2>🎉 Đặt vé thành công!</h2>

  <p><b>Mã booking:</b> ${fullBooking.bookingCode}</p>

  <p><b>Phim:</b> ${fullBooking.showtime?.movie?.title || ""}</p>

  <p><b>Rạp:</b> ${fullBooking.showtime?.cinema?.name || ""}</p>

  <p><b>Phòng:</b> ${fullBooking.showtime?.room?.name || ""}</p>

  <p><b>Giờ chiếu:</b>
    ${
      fullBooking.showtime?.startTime
        ? new Date(
            fullBooking.showtime.startTime
          ).toLocaleString("vi-VN")
        : ""
    }
  </p>

  <p><b>Ghế:</b> ${seats
    .map((s) => s.seatCode)
    .join(", ")}</p>

  <h3>📌 QR Code vé:</h3>

  <img src="cid:ticketqr" width="220"/>

  <p>Vui lòng đưa QR này khi vào rạp</p>
</div>
`,
      });
    }

    return res.redirect(
      `http://localhost:5173/payment-success?status=success&bookingId=${booking._id}`
    );
  } catch (err) {
    console.error("MOCK MOMO SUCCESS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * THANH TOÁN THẤT BẠI
 */
export const mockMomoFail = async (req, res) => {
  try {
    const { paymentId } = req.query;

    const { booking } =
      await failMockMomoPayment(paymentId);

    return res.redirect(
      `http://localhost:5173/payment-success?status=fail&bookingId=${booking._id}`
    );
  } catch (err) {
    console.error("MOCK MOMO FAIL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

