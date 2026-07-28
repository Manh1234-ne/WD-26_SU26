import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";
import { releaseReservedStock } from "../services/inventoryService.js";

export const startBookingTimeoutCheck = () => {
  console.log(
    "⏰ Trình quét booking đã được kích hoạt..."
  );

  setInterval(async () => {
    try {
      /**
       * =========================
       * HỦY BOOKING HẾT HẠN
       * =========================
       */
      const expiredBookings = await Booking.find({
        status: "pending",
        expiresAt: { $lt: new Date() },
      });

      if (expiredBookings.length > 0) {
        console.log(
          `🧹 Phát hiện ${expiredBookings.length} booking hết hạn`
        );

        for (const booking of expiredBookings) {

          // Hủy giữ ghế
          await BookingSeat.updateMany(
            { booking: booking._id },
            { status: "cancelled" }
          );

          // Lấy combo của booking
          const bookingCombos =
            await BookingCombo.find({
              booking: booking._id,
            });

          if (bookingCombos.length > 0) {

            const comboIds =
              bookingCombos.map((item) => ({
                combo: item.combo,
                quantity: item.quantity,
              }));

            // Trả lại số lượng đã reserve
            await releaseReservedStock(
              comboIds
            );
          }

          booking.status = "cancelled";
          booking.cancelledAt = new Date();

          await booking.save();
        }
      }

      /**
       * =========================
       * AUTO COMPLETED
       * =========================
       */
      const confirmedBookings = await Booking.find({
        status: "confirmed",
      }).populate("showtime");

      for (const booking of confirmedBookings) {
        if (
          booking.showtime &&
          booking.showtime.endTime &&
          booking.showtime.endTime < new Date()
        ) {
          booking.status = "completed";

          await booking.save();

          console.log(
            `✅ Booking ${booking.bookingCode} completed`
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Cron Job Error:",
        error.message
      );
    }
  }, 60000);
};