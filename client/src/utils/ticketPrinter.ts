import QRCode from "qrcode";
import dayjs from "dayjs";
import { api } from "../services/api";

export interface PrintableTicketData {
  bookingId?: string;
  bookingCode: string;
  cinemaName?: string;
  movieTitle: string;
  roomName: string;
  startTime?: string | Date;
  seats?: Array<any>;
  combos?: Array<any>;
  customerName?: string;
  customerPhone?: string;
  staffName?: string;
  paymentMethod?: string;
  seatTotalPrice?: number;
  comboTotalPrice?: number;
  discountAmount?: number;
  voucherCode?: string;
  finalAmount?: number;
  cashGiven?: number;
  changeGiven?: number;
}

export const printCinemaTicket = async (data: PrintableTicketData): Promise<boolean> => {
  try {
    const bookingCode = data.bookingCode || "LUMORA-POS";
    const qrDataUrl = await QRCode.toDataURL(bookingCode);

    const printWindow = window.open("", "_blank", "width=480,height=700");
    if (!printWindow) {
      alert("Vui lòng cho phép trình duyệt mở popup để thực hiện in vé!");
      return false;
    }

    const cinemaName = data.cinemaName || "LUMORA CINEMA";
    const movieTitle = data.movieTitle || "Phim Chưa Xác Định";
    const roomName = data.roomName || "Phòng Chiếu";
    const startTimeFormatted = data.startTime
      ? dayjs(data.startTime).format("DD/MM/YYYY - HH:mm")
      : "Chưa cập nhật";
    const printedAtFormatted = dayjs().format("DD/MM/YYYY HH:mm");

    // Format seat labels
    const seatsList = (data.seats || []).map((s: any) => {
      if (typeof s === "string") return s;
      return s.code || s.seatCode || s.label || (s.seat?.code) || (s.row && s.col ? `${s.row}${s.col}` : "Ghế");
    });
    const seatsDisplay = seatsList.length > 0 ? seatsList.join(", ") : "Chưa chọn ghế";

    // Format combos
    const combosList = (data.combos || []).map((c: any) => {
      const name = c.name || c.comboName || c.combo?.name || "Combo";
      const qty = c.quantity || c.qty || 1;
      const price = c.totalPrice || c.price || (c.combo?.price ? c.combo.price * qty : 0);
      return { name, qty, price };
    });

    const paymentMethodText =
      data.paymentMethod === "cash"
        ? "Tiền mặt"
        : data.paymentMethod === "vnpay"
        ? "VNPay"
        : data.paymentMethod === "qr" || data.paymentMethod === "bank"
        ? "Chuyển khoản / QR"
        : "Đã thanh toán";

    const finalTotal = data.finalAmount ?? 0;
    const seatTotal = data.seatTotalPrice ?? 0;
    const comboTotal = data.comboTotalPrice ?? 0;
    const discount = data.discountAmount ?? 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>In Vé Vé Xem Phim - ${bookingCode}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f1f5f9;
            color: #0f172a;
            display: flex;
            justify-content: center;
            padding: 20px;
          }
          
          .ticket-container {
            width: 360px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 20px 18px;
            color: #000000;
          }

          .header { text-align: center; margin-bottom: 12px; }
          .brand { font-size: 22px; font-weight: 900; letter-spacing: 1.5px; color: #000000; }
          .doc-type { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-top: 2px; }

          .divider-dashed { border-top: 1px dashed #94a3b8; margin: 10px 0; }
          .divider-solid { border-top: 2px solid #000000; margin: 10px 0; }

          .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
          .info-label { color: #475569; font-weight: 500; }
          .info-val { font-weight: 700; text-align: right; }

          .movie-section { margin: 8px 0; }
          .movie-title { font-size: 16px; font-weight: 900; text-transform: uppercase; line-height: 1.3; margin-bottom: 6px; }
          
          .seat-box {
            background-color: #000000;
            color: #ffffff;
            font-size: 15px;
            font-weight: 800;
            padding: 6px 10px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 4px;
            word-break: break-word;
          }

          .combo-section { font-size: 12px; margin: 6px 0; }
          .combo-title { font-weight: 800; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; color: #334155; }
          .combo-item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }

          .price-total { font-size: 15px; font-weight: 900; color: #000000; }

          .qr-section { text-align: center; margin-top: 12px; }
          .qr-img { width: 130px; height: 130px; margin: 0 auto; display: block; }
          .qr-text { font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 600; }

          .stub-section { margin-top: 16px; padding-top: 12px; border-top: 2px dashed #000000; text-align: center; }
          .stub-header { font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
          .stub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; text-align: left; font-size: 11px; }

          .footer-note { text-align: center; font-size: 10px; color: #64748b; font-style: italic; margin-top: 14px; }

          @media print {
            body { background: transparent; padding: 0; }
            .ticket-container {
              width: 80mm !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 4mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <div class="brand">${cinemaName}</div>
            <div class="doc-type">VÉ XEM PHIM & HÓA ĐƠN THANH TOÁN</div>
          </div>

          <div class="divider-dashed"></div>

          <div class="info-row">
            <span class="info-label">Mã đơn:</span>
            <span class="info-val" style="font-family: monospace; font-size: 13px;">${bookingCode}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Thời gian in:</span>
            <span class="info-val">${printedAtFormatted}</span>
          </div>
          ${data.customerName ? `
          <div class="info-row">
            <span class="info-label">Khách hàng:</span>
            <span class="info-val">${data.customerName} ${data.customerPhone ? `(${data.customerPhone})` : ""}</span>
          </div>
          ` : ""}
          ${data.staffName ? `
          <div class="info-row">
            <span class="info-label">Thu ngân:</span>
            <span class="info-val">${data.staffName}</span>
          </div>
          ` : ""}

          <div class="divider-dashed"></div>

          <div class="movie-section">
            <div class="movie-title">${movieTitle}</div>
            <div class="info-row">
              <span class="info-label">Phòng chiếu:</span>
              <span class="info-val">${roomName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Suất chiếu:</span>
              <span class="info-val" style="color: #2563eb;">${startTimeFormatted}</span>
            </div>
            <div style="margin-top: 6px;">
              <span class="info-label">Vị trí ghế (${seatsList.length} ghế):</span>
              <div><span class="seat-box">${seatsDisplay}</span></div>
            </div>
          </div>

          ${combosList.length > 0 ? `
          <div class="divider-dashed"></div>
          <div class="combo-section">
            <div class="combo-title">Bắp nước kèm theo:</div>
            ${combosList.map(c => `
              <div class="combo-item">
                <span>${c.name} x${c.qty}</span>
                <span>${c.price ? c.price.toLocaleString("vi-VN") + " đ" : ""}</span>
              </div>
            `).join("")}
          </div>
          ` : ""}

          <div class="divider-dashed"></div>

          ${seatTotal > 0 ? `
          <div class="info-row">
            <span class="info-label">Tiền ghế:</span>
            <span class="info-val">${seatTotal.toLocaleString("vi-VN")} đ</span>
          </div>
          ` : ""}

          ${comboTotal > 0 ? `
          <div class="info-row">
            <span class="info-label">Tiền bắp nước:</span>
            <span class="info-val">${comboTotal.toLocaleString("vi-VN")} đ</span>
          </div>
          ` : ""}

          ${discount > 0 ? `
          <div class="info-row">
            <span class="info-label">Giảm giá ${data.voucherCode ? `(${data.voucherCode})` : ""}:</span>
            <span class="info-val">-${discount.toLocaleString("vi-VN")} đ</span>
          </div>
          ` : ""}

          <div class="divider-solid"></div>

          <div class="info-row" style="align-items: center; margin-top: 4px;">
            <span class="price-total">TỔNG THANH TOÁN:</span>
            <span class="price-total" style="font-size: 17px; color: #000000;">${finalTotal.toLocaleString("vi-VN")} đ</span>
          </div>

          <div class="info-row" style="margin-top: 4px;">
            <span class="info-label">Hình thức:</span>
            <span class="info-val">${paymentMethodText}</span>
          </div>

          ${data.cashGiven !== undefined && data.cashGiven !== null && data.cashGiven > 0 ? `
          <div class="info-row">
            <span class="info-label">Tiền khách đưa:</span>
            <span class="info-val">${data.cashGiven.toLocaleString("vi-VN")} đ</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tiền thừa trả lại:</span>
            <span class="info-val">${Math.max(0, data.cashGiven - finalTotal).toLocaleString("vi-VN")} đ</span>
          </div>
          ` : ""}

          <div class="qr-section">
            <img src="${qrDataUrl}" class="qr-img" alt="Mã QR Vé" />
            <div class="qr-text">Quét mã QR tại cổng kiểm soát để vào phòng chiếu</div>
          </div>

          <div class="stub-section">
            <div class="stub-header">✂ - - - CUỐNG SOÁT VÉ - - - ✂</div>
            <div class="stub-grid">
              <div><strong>Phim:</strong> ${movieTitle}</div>
              <div><strong>Phòng:</strong> ${roomName}</div>
              <div><strong>Ghế:</strong> ${seatsDisplay}</div>
              <div><strong>Mã:</strong> ${bookingCode}</div>
            </div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px;">Suất: ${startTimeFormatted}</div>
          </div>

          <div class="footer-note">
            Cảm ơn quý khách đã lựa chọn ${cinemaName}!<br/>
            Chúc quý khách có trải nghiệm xem phim tuyệt vời!
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger API backend to mark printed & increment print count
    if (data.bookingId) {
      try {
        await api.patch(`/bookings/${data.bookingId}/print`);
      } catch (e) {
        console.error("Không thể ghi nhận trạng thái in vé lên backend:", e);
      }
    }

    return true;
  } catch (err) {
    console.error("Lỗi khi thực hiện in vé:", err);
    return false;
  }
};
