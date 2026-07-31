import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";
import BookingCombo from "../models/BookingCombo.js";
import { releaseReservedStock } from "../services/inventoryService.js";

export const startBookingTimeoutCheck = () => {
  console.log(
    "Trình quét booking đã được kích hoạt (interval: 30s)..."
  );

  setInterval(async () => {
    try {

      const now = new Date();

      const expiredBookings = await Booking.find({
        status: "pending",
        expiresAt: { $lt: now },
      }).select("_id bookingCode");

      if (expiredBookings.length > 0) {
        console.log(
          `🧹 Phát hiện ${expiredBookings.length} booking hết hạn – đang xử lý...`
        );

        const expiredIds = expiredBookings.map((b) => b._id);

        // Batch cancel tất cả BookingSeat liên quan – nhanh hơn loop
        await BookingSeat.updateMany(
          { booking: { $in: expiredIds } },
          { status: "cancelled" }
        );


        for (const booking of expiredBookings) {
          try {
            // Trả lại số lượng combo đã reserv
            const bookingCombos = await BookingCombo.find({
              booking: booking._id,
            });

            if (bookingCombos.length > 0) {
              const comboIds = bookingCombos.map((item) => ({
                combo: item.combo,
                quantity: item.quantity,
              }));
              await releaseReservedStock(comboIds);
            }

            // Dùng "expired" để phân biệt với "cancelled" do user chủ động hủy
            booking.status = "expired";
            booking.cancelledAt = now;
            await booking.save();

            console.log(
              ` Booking ${booking.bookingCode} → expired`
            );
          } catch (innerErr) {
            console.error(
              `Lỗi xử lý booking ${booking.bookingCode}:`,
              innerErr.message
            );
          }
        }
      }


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
            `🎬 Booking ${booking.bookingCode} → completed`
          );
        }
      }
    } catch (error) {
      console.error(
        " Cron Job Error:",
        error.message
      );
    }
  }, 30000);
};
