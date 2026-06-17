import Booking from "../models/Booking.js";
import BookingSeat from "../models/BookingSeat.js";

export const startBookingTimeoutCheck = () => {
  console.log("⏰ Trình quét đặt vé hết hạn đã được kích hoạt (1 phút/lần)...");
  
  setInterval(async () => {
    try {
      // Tìm các đơn hàng 'pending' và có expiresAt nhỏ hơn thời gian hiện tại
      const expiredBookings = await Booking.find({
        status: "pending",
        expiresAt: { $lt: new Date() }
      });

      if (expiredBookings.length > 0) {
        console.log(`🧹 Phát hiện ${expiredBookings.length} đơn hàng hết hạn. Đang tự động hủy...`);
        
        for (let booking of expiredBookings) {
          booking.status = "cancelled";
          booking.cancelledAt = new Date();
          await booking.save();
          
          // Giải phóng các ghế đang bị giữ (held -> cancelled)
          await BookingSeat.updateMany(
            { booking: booking._id },
            { status: "cancelled" }
          );
        }
        console.log("✅ Đã giải phóng ghế và hủy các đơn hàng hết hạn thành công.");
      }
    } catch (error) {
      console.error("❌ Lỗi trong quá trình quét tự động hủy đặt vé:", error.message);
    }
  }, 60000); // 60000ms = 1 phút
};