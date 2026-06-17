import { asyncHandler } from "../utils/asynHandler.js";
import {
  createVnPayUrlService,
  verifyVnPayReturnService,
} from "../services/paymentService.js";
import Payment from "../models/Payment.js";


const ok = (res, data) =>
  res.status(200).json({ success: true, data });

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

/**
 * 1. TẠO LINK THANH TOÁN
 */
export const createPaymentUrl = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const ipAddr =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  if (!bookingId) {
    return fail(res, 400, "Thiếu bookingId");
  }

  const result = await createVnPayUrlService({ bookingId, ipAddr });

  return ok(res, result);
});

/**
 * 2. VNPay RETURN URL (FE redirect về đây)
 * 👉 FE gọi API này để verify + hiển thị kết quả
 */
export const vnpayReturn = asyncHandler(async (req, res) => {
  const vnp_Params = req.query;

  if (!vnp_Params || Object.keys(vnp_Params).length === 0) {
    return fail(res, 400, "Không có dữ liệu VNPay");
  }

  const result = await verifyVnPayReturnService(vnp_Params);

  return ok(res, {
    message: "Thanh toán VNPay đã xác nhận",
    ...result,
  });
});

/**
 * 3. IPN (VNPay gọi server-to-server)
 * 👉 QUAN TRỌNG: không dùng FE
 */
export const vnpayIpn = asyncHandler(async (req, res) => {
  try {
    const result = await verifyVnPayReturnService(req.query);

    return res.status(200).json({
      RspCode: "00",
      Message: "Confirm Success",
    });
  } catch (error) {
    return res.status(200).json({
      RspCode: "97",
      Message: error.message,
    });
  }
});

/**
 * 4. GET payment theo booking
 */
export const getPaymentByBookingId = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const payment = await Payment.findOne({ booking: bookingId });

  if (!payment) {
    return fail(res, 404, "Không tìm thấy payment");
  }

  return ok(res, payment);
});