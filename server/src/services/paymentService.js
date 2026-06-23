import crypto from "crypto";
import moment from "moment";

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

/**
 * SORT OBJECT
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
 * =========================
 * CREATE VNPay URL
 * =========================
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
    throw new Error("Thiếu cấu hình VNPay");
  }

  const createDate = moment().utcOffset(7).format("YYYYMMDDHHmmss");

  const cleanIp =
    !ipAddr || ipAddr.includes("::") ? "127.0.0.1" : ipAddr;

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

  vnp_Params = sortObject(vnp_Params);

  const signData = new URLSearchParams(vnp_Params).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(signData, "utf-8").digest("hex");

  vnp_Params.vnp_SecureHash = signed;

  const paymentUrl =
    vnpUrl + "?" + new URLSearchParams(vnp_Params).toString();

  return { paymentUrl, payment };
};

/**
 * =========================
 * VERIFY VNPay
 * =========================
 */
export const verifyVnPayReturnService = async (vnp_Params) => {
  const secureHash = vnp_Params.vnp_SecureHash;

  if (!secureHash) throw new Error("Thiếu chữ ký VNPay");

  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const secretKey = process.env.vnp_HashSecret;

  const sortedParams = sortObject(vnp_Params);
  const signData = new URLSearchParams(sortedParams).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(signData, "utf-8").digest("hex");

  if (secureHash !== signed) {
    throw new Error("Sai chữ ký VNPay");
  }

  const payment = await Payment.findById(vnp_Params.vnp_TxnRef);
  if (!payment) throw new Error("Không tìm thấy payment");

  const booking = await Booking.findById(payment.booking);
  if (!booking) throw new Error("Không tìm thấy booking");

  if (payment.status !== "pending") {
    return { payment, booking };
  }

  const responseCode = vnp_Params.vnp_ResponseCode;

  if (responseCode === "00") {
    payment.status = "paid";
    payment.transactionId = vnp_Params.vnp_TransactionNo;
    payment.paidAt = new Date();

    booking.status = "confirmed";

    if (booking.voucher) {
    await Voucher.findByIdAndUpdate(
      booking.voucher,
      {
        $inc: {
          usedCount: 1,
        },
      }
    );
  }

    await BookingSeat.updateMany(
      { booking: booking._id },
      { status: "booked" }
    );
  } else {
    payment.status = "failed";
    payment.note = `VNPay error: ${responseCode}`;

    booking.status = "cancelled";

    await BookingSeat.updateMany(
      { booking: booking._id },
      { status: "cancelled" }
    );
  }

  await payment.save();
  await booking.save();

  return { payment, booking };
};