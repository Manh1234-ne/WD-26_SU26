import crypto from "crypto";
import moment from "moment";

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";
import Voucher from "../models/Voucher.js";

import {
  deductReservedStock,
  releaseReservedStock,
} from "./inventoryService.js";

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

  const bookingSeats = await BookingSeat.find({ booking: bookingId });
  const seatIds = bookingSeats.map((bs) => bs.seat);
  const alreadyBooked = await BookingSeat.findOne({
    showtime: booking.showtime,
    seat: { $in: seatIds },
    status: "booked",
  });

  if (alreadyBooked) {
    throw new Error("Ghế đã được thanh toán bởi khách hàng khác. Vui lòng chọn ghế khác.");
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
  } else if (payment.status === "pending") {
    payment.amount = booking.finalAmount;
    await payment.save();
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

  if (!secureHash) {
    throw new Error("Thiếu chữ ký VNPay");
  }

  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const secretKey = process.env.vnp_HashSecret;

  const sortedParams = sortObject(vnp_Params);

  const signData =
    new URLSearchParams(sortedParams).toString();

  const hmac = crypto.createHmac(
    "sha512",
    secretKey
  );

  const signed = hmac
    .update(signData, "utf-8")
    .digest("hex");

  if (secureHash !== signed) {
    throw new Error("Sai chữ ký VNPay");
  }

  const payment = await Payment.findById(
    vnp_Params.vnp_TxnRef
  );

  if (!payment) {
    throw new Error("Không tìm thấy payment");
  }

  const booking = await Booking.findById(
    payment.booking
  );

  if (!booking) {
    throw new Error("Không tìm thấy booking");
  }

  if (payment.status !== "pending") {
    return {
      payment,
      booking,
    };
  }

  const responseCode =
    vnp_Params.vnp_ResponseCode;

  /**
   * Lấy combo của booking
   */
  const bookingCombos =
    await BookingCombo.find({
      booking: booking._id,
    });

  const comboIds = bookingCombos.map(
    (item) => ({
      combo: item.combo,
      quantity: item.quantity,
    })
  );

  /**
   * Thanh toán thành công
   */
  if (responseCode === "00") {
    /**
     * Kiểm tra ghế lần cuối
     */
    const bookingSeats =
      await BookingSeat.find({
        booking: booking._id,
      });

    const seatIds = bookingSeats.map(
      (item) => item.seat
    );

    const alreadyBooked =
      await BookingSeat.findOne({
        showtime: booking.showtime,
        seat: {
          $in: seatIds,
        },
        status: "booked",
      });

    if (alreadyBooked) {
      payment.status = "failed";

      payment.note =
        "Ghế đã được người khác thanh toán trước.";

      booking.status = "cancelled";

      await BookingSeat.updateMany(
        {
          booking: booking._id,
        },
        {
          status: "cancelled",
        }
      );

      /**
       * Hoàn reserved kho combo
       */
      await releaseReservedStock(comboIds);

      await payment.save();
      await booking.save();

      throw new Error(
        "Ghế đã được người khác thanh toán trước."
      );
    }

    payment.status = "paid";

    payment.transactionId =
      vnp_Params.vnp_TransactionNo;

    payment.paidAt = new Date();

    booking.status = "confirmed";

    /**
     * Voucher
     */
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

    /**
     * Ghế booked
     */
    await BookingSeat.updateMany(
      {
        booking: booking._id,
      },
      {
        status: "booked",
      }
    );

    /**
     * Trừ kho thật
     */
    await deductReservedStock(comboIds);
  }

  /**
   * Thanh toán thất bại
   */
  else {
    payment.status = "failed";

    payment.note =
      `VNPay error: ${responseCode}`;

    booking.status = "cancelled";

    await BookingSeat.updateMany(
      {
        booking: booking._id,
      },
      {
        status: "cancelled",
      }
    );

    /**
     * Hoàn reserved kho
     */
    await releaseReservedStock(comboIds);
  }

  await payment.save();
  await booking.save();

  return {
    payment,
    booking,
  };
};