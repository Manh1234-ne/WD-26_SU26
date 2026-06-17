import crypto from "crypto";
import moment from "moment";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

/**
 * Sort object theo alphabet key (VNPay requirement)
 */
function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

/**
 * TẠO LINK THANH TOÁN VNPay
 */
export const createVnPayUrlService = async ({ bookingId, ipAddr }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) throw new Error("Không tìm thấy booking");
  if (booking.status !== "pending") {
    throw new Error("Booking không ở trạng thái chờ thanh toán");
  }

  let payment = await Payment.findOne({ booking: bookingId });

  if (!payment) {
    payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      amount: booking.finalAmount,
      method: "vnpay",
      status: "pending",
    });
  }

  const tmnCode = process.env.vnp_TmnCode;
  const secretKey = process.env.vnp_HashSecret;
  const vnpUrl = process.env.vnp_Url;
  const returnUrl = process.env.vnp_ReturnUrl;

  if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
    throw new Error("Thiếu cấu hình VNPay trong .env");
  }

  const createDate = moment().utcOffset(7).format("YYYYMMDDHHmmss");

  let cleanIp = ipAddr;
  if (!cleanIp || cleanIp.includes("::")) {
    cleanIp = "127.0.0.1";
  }

  // 🔥 1. Build params
  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: booking.finalAmount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: payment._id.toString(),
    vnp_OrderInfo: `Thanh toan don hang ${booking.bookingCode}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: cleanIp,
    vnp_CreateDate: createDate,
    vnp_Locale: "vn",
  };

  // 🔥 2. sort params
  vnp_Params = sortObject(vnp_Params);

  // 🔥 3. build sign data (QUAN TRỌNG: KHÔNG custom encode)
  const signData = new URLSearchParams(vnp_Params).toString();

  // 🔥 4. create signature
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(signData, "utf-8").digest("hex");

  // 🔥 5. attach signature
  vnp_Params.vnp_SecureHash = signed;

  // 🔥 6. build payment URL
  const paymentUrl =
    vnpUrl + "?" + new URLSearchParams(vnp_Params).toString();

  return {
    paymentUrl,
    payment,
  };
};

/**
 * VERIFY RETURN / IPN VNPay
 */
export const verifyVnPayReturnService = async (vnp_Params) => {
  const secureHash = vnp_Params.vnp_SecureHash;

  if (!secureHash) {
    throw new Error("Thiếu chữ ký VNPay");
  }

  // remove hash fields
  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const secretKey = process.env.vnp_HashSecret;

  if (!secretKey) {
    throw new Error("Thiếu VNPay secret key");
  }

  // 🔥 sort lại params
  const sortedParams = sortObject(vnp_Params);

  // 🔥 build sign string (KHÔNG encode custom)
  const signData = new URLSearchParams(sortedParams).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(signData, "utf-8").digest("hex");

  // ❌ sai chữ ký
  if (secureHash !== signed) {
    throw new Error("Sai chữ ký VNPay (code 70)");
  }

  const payment = await Payment.findById(vnp_Params.vnp_TxnRef);
  if (!payment) throw new Error("Không tìm thấy payment");

  const booking = await Booking.findById(payment.booking);
  if (!booking) throw new Error("Không tìm thấy booking");

  // tránh xử lý lại
  if (payment.status !== "pending") {
    return { payment, booking };
  }

  const responseCode = vnp_Params.vnp_ResponseCode;

  // ✔ SUCCESS
  if (responseCode === "00") {
    payment.status = "paid";
    payment.transactionId = vnp_Params.vnp_TransactionNo;
    payment.paidAt = new Date();

    booking.status = "confirmed";

    await BookingSeat.updateMany(
      { booking: booking._id },
      { status: "booked" }
    );
  }
  // ❌ FAILED
  else {
    payment.status = "failed";
    payment.note = `VNPay error: ${responseCode}`;

    booking.status = "cancelled";
    booking.cancelledAt = new Date();

    await BookingSeat.updateMany(
      { booking: booking._id },
      { status: "cancelled" }
    );
  }

  await payment.save();
  await booking.save();

  return { payment, booking };
};