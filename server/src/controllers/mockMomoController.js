 import { createMockMomoPayment } from "../services/mockMomoService.js";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import QRCode from "qrcode";

// tạo payment
export const createMockMomo = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const result = await createMockMomoPayment({ bookingId });

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

// trang mock payment
export const mockMomoPage = async (req, res) => {
  const { paymentId } = req.query;

  const payUrl = `http://localhost:5000/api/mock-momo/success?paymentId=${paymentId}`;

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
// success
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

  res.redirect(
    `http://localhost:5173/payment-success?status=success&bookingId=${booking._id}`
  );
};

// fail
export const mockMomoFail = async (req, res) => {
  const { paymentId } = req.query;

  const payment = await Payment.findById(paymentId);

  if (!payment) return res.send("Payment not found");

  payment.status = "failed";
  payment.note = "Mock payment failed";

  await payment.save();

  const booking = await Booking.findById(payment.booking);

  booking.status = "cancelled";
  await booking.save();

  await BookingSeat.updateMany(
    { booking: booking._id },
    { status: "cancelled" }
  );

  res.redirect(
    `http://localhost:5173/payment-success?status=fail&bookingId=${booking._id}`
  );
};