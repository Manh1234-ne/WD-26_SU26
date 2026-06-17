import express from "express";
import {
  createPaymentUrl,
  vnpayReturn,
  vnpayIpn,
  getPaymentByBookingId,
} from "../controllers/paymentController.js";

const router = express.Router();

/**
 * 1. Tạo link VNPay
 */
router.post("/create-vnpay-url", createPaymentUrl);

/**
 * 2. Return URL (FE redirect về đây)
 */
router.get("/vnpay-return", vnpayReturn);

/**
 * 3. IPN (VNPay server gọi)
 */
router.get("/vnpay-ipn", vnpayIpn);

/**
 * 4. Get payment theo booking
 */
router.get("/booking/:bookingId", getPaymentByBookingId);

export default router;