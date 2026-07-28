import QRCode from "qrcode";
import { generateTicketToken } from "./ticketToken.js";
import { sendMail } from "./sendMail.js";

export const generateQR = async (data) => {
  return await QRCode.toDataURL(typeof data === "string" ? data : JSON.stringify(data));
};

export const onPaymentSuccess = async (booking) => {
  const token = generateTicketToken(booking);

  const qrImageDataUrl = await QRCode.toDataURL(token);

  const recipientEmail = booking.user?.email || booking.userEmail;
  if (recipientEmail) {
    try {
      await sendMail({
        to: recipientEmail,
        subject: "Vé xem phim và mã QR check-in của bạn",
        html: `
          <h2>Cảm ơn bạn đã đặt vé xem phim!</h2>
          <p>Mã đơn hàng: <strong>${booking.bookingCode || booking._id}</strong></p>
          <p>Vui lòng xuất trình mã QR dưới đây tại rạp để check-in vào phòng chiếu:</p>
          <div style="margin: 20px 0;">
            <img src="${qrImageDataUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
          </div>
          <p>Chúc bạn có trải nghiệm xem phim vui vẻ!</p>
        `,
      });
    } catch (error) {
      console.error("Lỗi khi gửi email vé:", error);
    }
  }

  return qrImageDataUrl;
};