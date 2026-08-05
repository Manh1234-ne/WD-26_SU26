import { useEffect, useMemo, useState, useRef } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Card,
  Typography,
  Popconfirm,
  DatePicker,
  Drawer,
  Descriptions,
  Avatar,
  Tooltip,
  Row,
  Col,
  message,
  Divider,
  Timeline,
  Progress,
  Result,
  Spin,
  Modal,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  DollarOutlined,
  BarcodeOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  UserOutlined,
  CalendarOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  FilterOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import type { ColumnsType } from "antd/es/table";
import { api } from "../../services/api";
import {
  cancelBooking,
  completeBooking,
  getBookingById,
  incrementPrintCount,
} from "../../features/booking/booking.service";
import type { Booking, BookingWithSeats } from "../../features/booking/booking.types";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const statusOptions = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Chờ thanh toán", value: "pending" },
  { label: "Đã thanh toán", value: "confirmed" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Đã huỷ", value: "cancelled" },
];

const sortOptions = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Tổng tiền cao nhất", value: "highest_amount" },
  { label: "Tổng tiền thấp nhất", value: "lowest_amount" },
];

const statusTag = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Tag color="warning" style={{ borderRadius: "6px", fontWeight: 600, padding: "2px 8px" }}>
          Chờ thanh toán
        </Tag>
      );
    case "confirmed":
      return (
        <Tag color="processing" style={{ borderRadius: "6px", fontWeight: 600, padding: "2px 8px" }}>
          Đã thanh toán
        </Tag>
      );
    case "completed":
      return (
        <Tag color="success" style={{ borderRadius: "6px", fontWeight: 600, padding: "2px 8px" }}>
          Hoàn tất
        </Tag>
      );
    case "cancelled":
      return (
        <Tag color="error" style={{ borderRadius: "6px", fontWeight: 600, padding: "2px 8px" }}>
          Đã huỷ
        </Tag>
      );
    default:
      return (
        <Tag style={{ borderRadius: "6px", fontWeight: 600, padding: "2px 8px" }}>
          {status}
        </Tag>
      );
  }
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function ManageBooking() {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [sortKey, setSortKey] = useState("newest");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    stage: "idle" | "users" | "bookings" | "done";
  }>({
    current: 0,
    total: 0,
    stage: "idle",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<BookingWithSeats | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const handleOpenDetailsById = async (bookingId: string) => {
    setSelectedBooking(null);
    setDrawerOpen(true);
    setLoadingDetails(true);
    setSelectedBookingDetails(null);
    setQrCodeUrl("");

    try {
      const res = await getBookingById(bookingId);
      if (res?.success && res?.data) {
        const data = res.data;
        setSelectedBookingDetails(data);
        setSelectedBooking(data.booking);
        if (data.booking && (data.booking.status === "confirmed" || data.booking.status === "completed")) {
          const ticketData = {
            bookingId: data.booking._id,
            bookingCode: data.booking.bookingCode,
            movie: data.booking.showtime?.movie?.title,
            cinema: data.booking.showtime?.cinema?.name || "Rạp Lumora",
            room: data.booking.showtime?.room?.name,
            time: data.booking.showtime?.startTime,
            seats: (data.seats || []).map((s: any) => s.seatCode),
          };
          const url = await QRCode.toDataURL(JSON.stringify(ticketData));
          setQrCodeUrl(url);
        }
      } else {
        void message.error("Không thể tải chi tiết vé");
        setDrawerOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      void message.error("Lỗi khi tải chi tiết vé");
      setDrawerOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const startScanner = async () => {
    try {
      setTimeout(async () => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          console.error("Không tìm thấy phần tử reader");
          return;
        }
        const scanner = new Html5Qrcode("reader");
        qrScannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            void handleScanSuccess(decodedText);
          },
          () => {
            // Verbose error, ignore
          }
        );
      }, 300);
    } catch (err) {
      console.error("Lỗi khởi động camera:", err);
      void message.error("Không thể khởi động camera. Vui lòng cấp quyền truy cập camera.");
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch (err) {
        console.error("Lỗi dừng camera:", err);
      }
      qrScannerRef.current = null;
    }
  };

  const processScannedTicket = async (bookingId: string) => {
    try {
      const res = await getBookingById(bookingId);
      if (!res?.success || !res?.data?.booking) {
        void message.error("Không tìm thấy thông tin vé trên hệ thống.");
        return;
      }

      const booking = res.data.booking;

      if (booking.status === "confirmed") {
        try {
          await completeBooking(bookingId);
          void message.success("Soát vé thành công! Đã tự động hoàn tất soát vé đơn hàng.");
          void fetchAllBookings();
        } catch (completeErr) {
          console.error("Lỗi khi tự động hoàn tất soát vé:", completeErr);
          const err = completeErr as { response?: { data?: { message?: string } } };
          void message.error(err?.response?.data?.message || "Không thể tự động hoàn tất soát vé");
        }
      } else if (booking.status === "completed") {
        void message.warning("Vé này đã được soát vé vào rạp trước đó!");
      } else if (booking.status === "pending") {
        void message.error("Vé chưa được thanh toán! Vui lòng thanh toán trước khi soát vé.");
      } else if (booking.status === "cancelled") {
        void message.error("Vé này đã bị hủy trên hệ thống.");
      } else {
        void message.info(`Đơn vé đang ở trạng thái: ${booking.status}`);
      }

      void handleOpenDetailsById(bookingId);

    } catch (err) {
      console.error("Lỗi xử lý vé quét:", err);
      void message.error("Lỗi khi kết nối với máy chủ soát vé.");
    }
  };

  const handleScanSuccess = async (text: string) => {
    await stopScanner();
    setScannerModalOpen(false);

    try {
      const data = JSON.parse(text);
      if (data && (data.bookingId || data.bookingCode)) {
        const id = data.bookingId || data.bookingCode;
        void processScannedTicket(id);
      } else {
        void message.error("Mã QR không đúng định dạng vé.");
      }
    } catch {
      if (text && text.length === 24) {
        void processScannedTicket(text);
      } else {
        void message.error("Quét mã QR thất bại: Dữ liệu không hợp lệ.");
      }
    }
  };

  const executePrint = async (bookingId: string) => {
    if (!selectedBookingDetails) return;
    const { booking, seats } = selectedBookingDetails;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      void message.error("Vui lòng cho phép mở popup để in vé.");
      return;
    }

    const movieTitle = booking.showtime?.movie?.title || "Phim chưa xác định";
    const cinemaName = booking.showtime?.cinema?.name || "Rạp chiếu";
    const roomName = booking.showtime?.room?.name || "Phòng";
    const startTime = booking.showtime?.startTime
      ? dayjs(booking.showtime.startTime).format("DD/MM/YYYY HH:mm")
      : "Chưa cập nhật";
    const bookingCode = booking.bookingCode || booking._id;

    const basePrice = booking.showtime?.basePrice || 0;
    const seatCount = seats?.length || 1;

    let ticketHTML = `
      <html>
      <head>
        <title>In Vé Xem Phim - ${bookingCode}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #000000;
          }
          .tickets-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 20px;
          }
          .ticket {
            width: 650px;
            border: 2px solid #000000;
            border-radius: 12px;
            display: flex;
            flex-direction: row;
            overflow: hidden;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
          }
          .ticket-main {
            flex: 7;
            padding: 20px;
            border-right: 2px dashed #000000;
            position: relative;
          }
          .ticket-stub {
            flex: 3;
            padding: 20px;
            background-color: #fafafa;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
          }
          .ticket-header {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            border-bottom: 2px solid #000000;
            padding-bottom: 6px;
          }
          .movie-title {
            font-size: 20px;
            font-weight: 900;
            margin: 8px 0;
            text-transform: uppercase;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 15px;
          }
          .info-grid-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #555555;
            font-weight: 600;
          }
          .info-value {
            font-size: 14px;
            font-weight: 800;
          }
          .seat-highlight {
            font-size: 24px;
            font-weight: 900;
            background-color: #000000;
            color: #ffffff;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 4px;
          }
          .barcode {
            margin-top: 15px;
            font-family: 'monospace';
            font-size: 11px;
            letter-spacing: 2px;
            text-align: center;
          }
          .stub-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #555555;
          }
          .stub-seat {
            font-size: 28px;
            font-weight: 900;
            margin: 10px 0;
          }
          .stub-info {
            font-size: 11px;
            font-weight: 600;
          }
          .ticket-index {
            font-size: 11px;
            font-weight: 600;
            border: 1px solid #000000;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          @media print {
            body {
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .tickets-container {
              padding: 0;
              gap: 0;
            }
            .ticket {
              border: 2px solid #000000;
              margin-bottom: 0;
              page-break-after: always;
              break-after: page;
            }
          }
        </style>
      </head>
      <body>
        <div class="tickets-container">
    `;

    seats.forEach((seat: any, index: number) => {
      const seatCode = seat.seatCode || seat.label || (seat.row && seat.col ? `${seat.row}${seat.col}` : "-");
      const seatTypeLabel = (seat.seatType || seat.type) === "vip" ? "VIP" : (seat.seatType || seat.type) === "couple" ? "Đôi" : "Thường";
      const seatPrice = seat.price || (basePrice * (seat.priceMultiplier || 1));

      ticketHTML += `
        <div class="ticket">
          <div class="ticket-main">
            <div class="ticket-header">${cinemaName}</div>
            <div class="movie-title">${movieTitle}</div>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Suất Chiếu</span>
                <span class="info-value">${startTime}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phòng Chiếu</span>
                <span class="info-value">${roomName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Loại Ghế</span>
                <span class="info-value">${seatTypeLabel}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Mã Giao Dịch</span>
                <span class="info-value" style="font-family: monospace;">${bookingCode}</span>
              </div>
            </div>
            
            <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div class="info-item">
                <span class="info-label">Ghế Ngồi</span>
                <span class="seat-highlight">${seatCode}</span>
              </div>
              <div class="info-item" style="text-align: right;">
                <span class="info-label">Giá Vé</span>
                <span class="info-value">${seatPrice.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>
          
          <div class="ticket-stub">
            <div>
              <div class="ticket-index">VÉ ${index + 1} / ${seatCount}</div>
              <div class="stub-title">SOÁT VÉ</div>
            </div>
            <div class="stub-seat">${seatCode}</div>
            <div>
              <div class="stub-info">${roomName}</div>
              <div class="stub-info" style="font-size: 9px; color: #555555; margin-top: 4px;">${startTime}</div>
            </div>
          </div>
        </div>
      `;
    });

    ticketHTML += `
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

    printWindow.document.write(ticketHTML);
    printWindow.document.close();

    // Increment print count in database
    try {
      const res = await incrementPrintCount(bookingId);
      if (res?.success) {
        setSelectedBookingDetails((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            booking: {
              ...prev.booking,
              printCount: (prev.booking.printCount || 0) + 1,
            },
          };
        });
        setSelectedBooking((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            printCount: (prev.printCount || 0) + 1,
          };
        });
        void fetchAllBookings();
        void message.success("Đã ghi nhận in vé thành công!");
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật số lần in vé:", err);
      void message.error("Không thể cập nhật số lần in vé trên máy chủ.");
    }
  };

  const handlePrintConfirm = () => {
    if (!selectedBookingDetails) return;
    const { booking } = selectedBookingDetails;
    const printCount = booking.printCount || 0;

    if (printCount > 0) {
      Modal.confirm({
        title: "Xác nhận in lại vé?",
        content: `Vé này đã được in ${printCount} lần trước đó. Bạn có chắc chắn muốn in lại không?`,
        okText: "Đồng ý in lại",
        cancelText: "Hủy bỏ",
        okButtonProps: { type: "primary" },
        onOk: () => {
          void executePrint(booking._id);
        },
      });
    } else {
      void executePrint(booking._id);
    }
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    setSyncProgress({ current: 0, total: 0, stage: "users" });
    try {
      const seatsRes = await api.get("/booking-seats");
      const seatsList = seatsRes.data?.data || [];

      const uniqueBookingIds = Array.from(
        new Set(seatsList.map((s: any) => s.booking?._id).filter(Boolean))
      ) as string[];

      if (!uniqueBookingIds.length) {
        setBookings([]);
        setSyncProgress({ current: 0, total: 0, stage: "done" });
        return;
      }

      setSyncProgress({ current: 0, total: uniqueBookingIds.length, stage: "bookings" });

      const allDbBookings: Booking[] = [];
      const chunkSize = 15;

      for (let i = 0; i < uniqueBookingIds.length; i += chunkSize) {
        const chunk = uniqueBookingIds.slice(i, i + chunkSize);
        const promises = chunk.map(async (bookingId) => {
          try {
            const res = await getBookingById(bookingId);
            if (res?.success && res?.data?.booking) {
              return res.data.booking;
            }
            return null;
          } catch (e) {
            return null;
          }
        });

        const results = await Promise.all(promises);
        allDbBookings.push(...(results.filter(Boolean) as Booking[]));
        setSyncProgress((prev) => ({
          ...prev,
          current: Math.min(i + chunkSize, uniqueBookingIds.length),
        }));
      }

      setBookings(allDbBookings);
      setSyncProgress((prev) => ({ ...prev, stage: "done" }));
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu bookings:", err);
      void message.error(err?.response?.data?.message || "Không thể đồng bộ bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllBookings();
  }, []);

  const handleComplete = async (record: Booking) => {
    setActionLoading(true);
    try {
      await completeBooking(record._id);
      void message.success("Đã hoàn tất soát vé đơn đặt chỗ!");
      void fetchAllBookings();
      if (selectedBooking?._id === record._id) {
        void handleOpenDetails(record);
      }
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Không thể hoàn tất đơn đặt vé");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (record: Booking) => {
    setActionLoading(true);
    try {
      await cancelBooking(record._id);
      void message.success("Đã hủy đơn đặt vé thành công!");
      void fetchAllBookings();
      if (selectedBooking?._id === record._id) {
        void handleOpenDetails(record);
      }
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Không thể huỷ đơn đặt vé");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setDrawerOpen(true);
    setLoadingDetails(true);
    setSelectedBookingDetails(null);
    setQrCodeUrl("");

    try {
      const res = await getBookingById(booking._id);
      if (res?.success && res?.data) {
        const data = res.data;
        setSelectedBookingDetails(data);
        if (data.booking && (data.booking.status === "confirmed" || data.booking.status === "completed")) {
          const ticketData = {
            bookingId: data.booking._id,
            bookingCode: data.booking.bookingCode,
            movie: data.booking.showtime?.movie?.title,
            cinema: data.booking.showtime?.cinema?.name || "Rạp Lumora",
            room: data.booking.showtime?.room?.name,
            time: data.booking.showtime?.startTime,
            seats: (data.seats || []).map((s: any) => s.seatCode),
          };
          const url = await QRCode.toDataURL(JSON.stringify(ticketData));
          setQrCodeUrl(url);
        }
      } else {
        void message.error("Không thể tải chi tiết ghế ngồi");
      }
    } catch (err: any) {
      console.error(err);
      void message.error("Lỗi khi tải chi tiết ghế ngồi");
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        const searchLower = searchValue.trim().toLowerCase();
        let matchesSearch = true;
        if (searchLower) {
          matchesSearch = [
            booking.bookingCode,
            booking.user?.fullName,
            booking.user?.email,
            booking.user?.phone,
            booking.showtime?.movie?.title,
            booking.showtime?.cinema?.name,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchLower);
        }

        const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

        let matchesDate = true;
        if (dateRange && dateRange[0] && dateRange[1]) {
          const createdAt = dayjs(booking.createdAt);
          const start = dateRange[0].startOf("day");
          const end = dateRange[1].endOf("day");
          matchesDate = createdAt.isBetween(start, end, null, "[]");
        }

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateA = dayjs(a.createdAt).valueOf();
        const dateB = dayjs(b.createdAt).valueOf();
        const amountA = a.finalAmount || 0;
        const amountB = b.finalAmount || 0;

        switch (sortKey) {
          case "oldest":
            return dateA - dateB;
          case "highest_amount":
            return amountB - amountA;
          case "lowest_amount":
            return amountA - amountB;
          case "newest":
          default:
            return dateB - dateA;
        }
      });
  }, [bookings, searchValue, statusFilter, dateRange, sortKey]);

  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const confirmedOrCompleted = filteredBookings.filter(
      (b) => b.status === "confirmed" || b.status === "completed"
    );
    const revenue = confirmedOrCompleted.reduce((sum, b) => sum + (b.finalAmount || 0), 0);
    const cancelled = filteredBookings.filter((b) => b.status === "cancelled").length;
    const successRate = total > 0 ? Math.round((confirmedOrCompleted.length / total) * 1000) / 10 : 0;

    return {
      total,
      revenue,
      cancelled,
      successRate,
    };
  }, [filteredBookings]);

  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      void message.warning("Không có dữ liệu để xuất báo cáo!");
      return;
    }

    const headers = [
      "Mã Booking",
      "Khách hàng",
      "Email",
      "Số điện thoại",
      "Phim",
      "Rạp",
      "Tổng tiền (VND)",
      "Giảm giá (VND)",
      "Thực tế thanh toán (VND)",
      "Trạng thái",
      "Ngày đặt",
    ];

    const rows = filteredBookings.map((b) => [
      b.bookingCode,
      b.user?.fullName || "Khách vãng lai",
      b.user?.email || "N/A",
      b.user?.phone || "N/A",
      b.showtime?.movie?.title || "N/A",
      b.showtime?.cinema?.name || "N/A",
      b.totalSeatPrice || 0,
      b.discountAmount || 0,
      b.finalAmount || 0,
      b.status === "pending"
        ? "Chờ thanh toán"
        : b.status === "confirmed"
          ? "Đã thanh toán"
          : b.status === "completed"
            ? "Hoàn tất"
            : "Đã hủy",
      dayjs(b.createdAt).format("DD/MM/YYYY HH:mm"),
    ]);

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCaoBooking_Admin_${dayjs().format("YYYYMMDD_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    void message.success("Xuất báo cáo CSV thành công!");
  };

  const columns: ColumnsType<Booking> = [
    {
      title: "Mã Booking",
      dataIndex: "bookingCode",
      key: "bookingCode",
      width: 180,
      render: (value, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 700, color: "#1e293b", fontFamily: "monospace", fontSize: 13 }}>
            {value || record._id.substring(0, 10).toUpperCase()}
          </span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(record.createdAt).format("DD/MM/YYYY HH:mm")}
          </Text>
        </div>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 200,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar
            style={{ backgroundColor: "#ffe4e6", color: "#e11d48" }}
            icon={<UserOutlined />}
          >
            {record.user?.fullName?.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
              {record.user?.fullName || "Khách vãng lai"}
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {record.user?.email || "Chưa cập nhật email"}
            </span>
            {record.user?.phone && (
              <span style={{ fontSize: 10, color: "#94a3b8" }}>
                SĐT: {record.user.phone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Phim & Suất chiếu",
      key: "showtime",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {record.showtime?.movie?.posterUrl ? (
            <img
              src={record.showtime.movie.posterUrl}
              alt={record.showtime.movie.title}
              style={{ width: 36, height: 48, borderRadius: "4px", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
            />
          ) : (
            <Avatar shape="square" size={40} style={{ backgroundColor: "#e2e8f0", color: "#475569" }} icon={<VideoCameraOutlined />} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>
              {record.showtime?.movie?.title || "Phim không xác định"}
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {record.showtime?.cinema?.name || "Rạp chưa rõ"} · {record.showtime?.room?.name || "Phòng chiếu"}
            </span>
            {record.showtime?.startTime && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <ClockCircleOutlined style={{ fontSize: 10, color: "#e11d48" }} />
                <span style={{ fontSize: 11, color: "#e11d48", fontWeight: 600 }}>
                  {dayjs(record.showtime.startTime).format("DD/MM/YYYY HH:mm")}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Tổng thanh toán",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 160,
      render: (value, record) => (
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
            {formatCurrency(value || 0)}
          </span>
          {record.discountAmount > 0 && (
            <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 500 }}>
              Đã giảm {formatCurrency(record.discountAmount)}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => statusTag(status),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Space size="middle">
            <Tooltip title="Xem chi tiết vé">
              <Button
                shape="circle"
                icon={<EyeOutlined style={{ color: "#3b82f6" }} />}
                onClick={() => void handleOpenDetails(record)}
              />
            </Tooltip>

            {record.status === "confirmed" && (
              <Popconfirm
                title="Xác nhận soát vé hoàn tất?"
                description="Hành động này xác nhận khách hàng vào phòng chiếu."
                onConfirm={() => void handleComplete(record)}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Tooltip title="Hoàn tất soát vé">
                  <Button
                    shape="circle"
                    type="primary"
                    ghost
                    icon={<CheckCircleOutlined style={{ color: "#10b981" }} />}
                    loading={actionLoading}
                  />
                </Tooltip>
              </Popconfirm>
            )}

            {(record.status === "pending" || record.status === "confirmed") && (
              <Popconfirm
                title="Xác nhận hủy đặt vé?"
                description="Hành động này sẽ giải phóng toàn bộ ghế đã đặt."
                onConfirm={() => void handleCancel(record)}
                okText="Hủy vé"
                cancelText="Hủy bỏ"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Hủy đơn vé">
                  <Button
                    shape="circle"
                    danger
                    ghost
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
          {record.printCount && record.printCount > 0 ? (
            <Tag color="cyan" style={{ fontSize: 10, margin: 0, borderRadius: 4, fontWeight: 600 }}>
              Đã in vé {record.printCount} lần
            </Tag>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .booking-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #f1f5f9;
        }
        .booking-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -5px rgba(225, 29, 72, 0.08) !important;
        }
        .cinema-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 16px;
          padding: 24px 32px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 24px;
        }
        .ticket-stub {
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e2e8f0;
          position: relative;
        }
        .ticket-notch-left, .ticket-notch-right {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #f1f5f9;
          bottom: 120px;
          z-index: 5;
        }
        .ticket-notch-left {
          left: -10px;
          border-right: 1px solid #e2e8f0;
        }
        .ticket-notch-right {
          right: -10px;
          border-left: 1px solid #e2e8f0;
        }
        .ant-table-thead > tr > th {
          background-color: #f1f5f9 !important;
          font-weight: 700 !important;
          color: #334155 !important;
        }
      `}} />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Banner Header */}
        <div className="cinema-header">
          <div>
            <Title level={2} style={{ margin: 0, color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
              <BarcodeOutlined style={{ color: "#e11d48" }} />
              Quản Lý Đơn Đặt Vé
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 14 }}>
              Theo dõi doanh thu phòng chiếu, kiểm tra hóa đơn vé, và xác nhận soát vé khách hàng.
            </Text>
          </div>
          <Space wrap>
            <Button
              type="primary"
              size="large"
              style={{ background: "#10b981", borderColor: "#10b981", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, borderRadius: "8px" }}
              icon={<QrcodeOutlined />}
              onClick={() => setScannerModalOpen(true)}
            >
              Quét mã QR soát vé
            </Button>

            <Button
              type="primary"
              size="large"
              style={{ background: "#e11d48", borderColor: "#e11d48", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, borderRadius: "8px" }}
              icon={<DownloadOutlined />}
              onClick={exportToCSV}
            >
              Xuất báo cáo (CSV)
            </Button>

            <Button
              size="large"
              style={{ borderRadius: "8px", fontWeight: 500 }}
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => void fetchAllBookings()}
            >
              Làm mới dữ liệu
            </Button>
          </Space>
        </div>

        {/* Sync Progress Loading Alert */}
        {loading && syncProgress.stage !== "idle" && (
          <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: 600 }}>
                  {syncProgress.stage === "users"
                    ? "Đang tải danh sách vé và ghế..."
                    : `Đang liên kết dữ liệu chi tiết đơn vé: ${syncProgress.current} / ${syncProgress.total} đơn`}
                </Text>
                <Spin size="small" />
              </div>
              {syncProgress.stage === "bookings" && (
                <Progress
                  percent={Math.round((syncProgress.current / syncProgress.total) * 100)}
                  strokeColor={{ "0%": "#f43f5e", "100%": "#e11d48" }}
                  status="active"
                />
              )}
            </Space>
          </Card>
        )}

        {/* Statistics Panel */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="booking-card"
              style={{
                borderRadius: "12px",
                borderLeft: "5px solid #e11d48",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Tổng Đơn Đặt Vé
                  </Text>
                  <Title level={3} style={{ margin: "6px 0 0 0", fontWeight: 800, color: "#0f172a" }}>
                    {loading ? <Spin size="small" /> : stats.total}
                  </Title>
                </div>
                <Avatar
                  shape="square"
                  size={44}
                  style={{ backgroundColor: "#ffe4ea", color: "#e11d48", borderRadius: "8px" }}
                  icon={<InboxOutlined />}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tổng đơn theo bộ lọc
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="booking-card"
              style={{
                borderRadius: "12px",
                borderLeft: "5px solid #10b981",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Doanh thu lọc được
                  </Text>
                  <Title level={3} style={{ margin: "6px 0 0 0", fontWeight: 800, color: "#10b981" }}>
                    {loading ? <Spin size="small" /> : formatCurrency(stats.revenue)}
                  </Title>
                </div>
                <Avatar
                  shape="square"
                  size={44}
                  style={{ backgroundColor: "#d1fae5", color: "#10b981", borderRadius: "8px" }}
                  icon={<DollarOutlined />}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tính đơn đã thanh toán & hoàn tất
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="booking-card"
              style={{
                borderRadius: "12px",
                borderLeft: "5px solid #3b82f6",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Tỉ Lệ Đặt Vé Thành Công
                  </Text>
                  <Title level={3} style={{ margin: "6px 0 0 0", fontWeight: 800, color: "#3b82f6" }}>
                    {loading ? <Spin size="small" /> : `${stats.successRate}%`}
                  </Title>
                </div>
                <Avatar
                  shape="square"
                  size={44}
                  style={{ backgroundColor: "#dbeafe", color: "#3b82f6", borderRadius: "8px" }}
                  icon={<TrophyOutlined />}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Đơn đã thanh toán / Tổng đơn
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              bordered={false}
              className="booking-card"
              style={{
                borderRadius: "12px",
                borderLeft: "5px solid #f97316",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                    Đơn Đã Hủy
                  </Text>
                  <Title level={3} style={{ margin: "6px 0 0 0", fontWeight: 800, color: "#f97316" }}>
                    {loading ? <Spin size="small" /> : stats.cancelled}
                  </Title>
                </div>
                <Avatar
                  shape="square"
                  size={44}
                  style={{ backgroundColor: "#ffedd5", color: "#f97316", borderRadius: "8px" }}
                  icon={<CloseCircleOutlined />}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Đơn đã hủy hoặc hết hạn
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Filter Operations Card */}
        <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8} xl={6}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text strong style={{ fontSize: 12, color: "#64748b" }}>Tìm kiếm thông tin</Text>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Mã vé, tên khách, phim, rạp..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  style={{ width: "100%", borderRadius: "6px" }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={5} xl={4}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text strong style={{ fontSize: 12, color: "#64748b" }}>Trạng thái đơn</Text>
                <Select
                  value={statusFilter}
                  options={statusOptions}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: "100%" }}
                  dropdownStyle={{ borderRadius: "8px" }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} xl={5}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text strong style={{ fontSize: 12, color: "#64748b" }}>Khoảng thời gian đặt</Text>
                <RangePicker
                  placeholder={["Từ ngày", "Đến ngày"]}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as any)}
                  style={{ width: "100%", borderRadius: "6px" }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={5} xl={4}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Text strong style={{ fontSize: 12, color: "#64748b" }}>Sắp xếp theo</Text>
                <Select
                  value={sortKey}
                  options={sortOptions}
                  onChange={(val) => setSortKey(val)}
                  style={{ width: "100%" }}
                  dropdownStyle={{ borderRadius: "8px" }}
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={6} xl={5} style={{ display: "flex", alignSelf: "flex-end" }}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => {
                  setSearchValue("");
                  setStatusFilter("all");
                  setDateRange(null);
                  setSortKey("newest");
                  void fetchAllBookings();
                  void message.info("Đã đặt lại bộ lọc tìm kiếm!");
                }}
                style={{ width: "100%", borderRadius: "6px", fontWeight: 500 }}
              >
                Đặt lại bộ lọc
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Table Data */}
        <Card
          bordered={false}
          style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)", overflow: "hidden" }}
          styles={{ body: { padding: 0 } }}
        >
          {filteredBookings.length === 0 && !loading ? (
            <div style={{ padding: "48px 0" }}>
              <Result
                status="warning"
                title="Không có đơn đặt vé nào"
                subTitle="Không tìm thấy dữ liệu đặt vé nào trong cơ sở dữ liệu hoặc khớp với điều kiện tìm kiếm."
                extra={
                  <Button type="primary" onClick={() => void fetchAllBookings()} icon={<ReloadOutlined />}>
                    Thử tải lại dữ liệu
                  </Button>
                }
              />
            </div>
          ) : (
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={filteredBookings}
              loading={loading}
              pagination={{
                pageSize: 8,
                showTotal: (total) => `Tổng số ${total} đơn đặt vé từ hệ thống`,
              }}
              scroll={{ x: true }}
            />
          )}
        </Card>
      </Space>

      {/* Ticket Details Slide Drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarcodeOutlined style={{ color: "#e11d48", fontSize: 22 }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>CHI TIẾT VÉ XEM PHIM</span>
          </div>
        }
        width={540}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{
          body: { padding: "20px 24px", backgroundColor: "#f1f5f9" },
          header: { borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }
        }}
      >
        {loadingDetails ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "350px" }}>
            <Space direction="vertical" align="center" size="middle">
              <Spin size="large" />
              <Text type="secondary" style={{ fontWeight: 500 }}>Đang truy xuất thông tin vé và ghế từ rạp...</Text>
            </Space>
          </div>
        ) : selectedBookingDetails ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Physical ticket mockup card */}
            <div className="ticket-stub">
              {/* Ticket header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #be123c 0%, #e11d48 100%)",
                  padding: "24px 20px",
                  color: "#ffffff",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", opacity: 0.8, fontWeight: 700 }}>
                      Suất Chiếu Phim
                    </span>
                    <h3 style={{ margin: "4px 0 0 0", color: "#ffffff", fontWeight: 900, fontSize: 18, lineHeight: 1.3 }}>
                      {selectedBookingDetails.booking.showtime?.movie?.title || "Phim chưa xác định"}
                    </h3>
                  </div>
                  {statusTag(selectedBookingDetails.booking.status)}
                </div>

                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: "24px 32px" }}>
                  <div>
                    <span style={{ fontSize: 9, opacity: 0.75, display: "block", fontWeight: 700, letterSpacing: "0.5px" }}>RẠP CHIẾU</span>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      {selectedBookingDetails.booking.showtime?.cinema?.name || "Rạp chiếu"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, opacity: 0.75, display: "block", fontWeight: 700, letterSpacing: "0.5px" }}>PHÒNG CHIẾU</span>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      {selectedBookingDetails.booking.showtime?.room?.name || "Phòng"}
                    </span>
                  </div>
                </div>

                {/* Left & Right ticket notches */}
                <div className="ticket-notch-left" />
                <div className="ticket-notch-right" />
              </div>

              {/* Dotted separator line */}
              <div
                style={{
                  borderTop: "2px dashed #cbd5e1",
                  padding: "0 20px",
                  backgroundColor: "#ffffff",
                  height: 0,
                  position: "relative",
                  zIndex: 2,
                }}
              />

              {/* Ticket body */}
              <div style={{ padding: "24px 20px", backgroundColor: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <InfoCircleOutlined style={{ color: "#e11d48" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>THÔNG TIN ĐẶT VÉ</span>
                </div>

                <Descriptions column={1} size="small" labelStyle={{ color: "#64748b", fontWeight: 500 }} contentStyle={{ color: "#0f172a", fontWeight: 600 }}>
                  <Descriptions.Item label="Mã booking">
                    <span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 13, color: "#be123c" }}>
                      {selectedBookingDetails.booking.bookingCode || selectedBookingDetails.booking._id}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian giao dịch">
                    {dayjs(selectedBookingDetails.booking.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Khách hàng">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <UserOutlined style={{ fontSize: 12, color: "#e11d48" }} />
                      {selectedBookingDetails.booking.user?.fullName}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Liên hệ">
                    {selectedBookingDetails.booking.user?.email} {selectedBookingDetails.booking.user?.phone && `· ${selectedBookingDetails.booking.user?.phone}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lịch bắt đầu phim">
                    <span style={{ color: "#e11d48", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <CalendarOutlined />
                      {selectedBookingDetails.booking.showtime?.startTime
                        ? dayjs(selectedBookingDetails.booking.showtime.startTime).format("DD/MM/YYYY HH:mm")
                        : "Chưa cập nhật"}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ghế đã chọn">
                    <Space wrap style={{ marginTop: 4 }}>
                      {selectedBookingDetails.seats && selectedBookingDetails.seats.length > 0 ? (
                        selectedBookingDetails.seats.map((seat: any) => (
                          <Tag
                            color={(seat.seatType || seat.type)?.toUpperCase() === "VIP" ? "gold" : (seat.seatType || seat.type) === "couple" ? "magenta" : "blue"}
                            key={seat._id}
                            style={{ fontWeight: 700, borderRadius: "4px" }}
                          >
                            {seat.seatCode || seat.label || (seat.row && seat.col ? `${seat.row}${seat.col}` : "-")} ({(seat.seatType || seat.type) === "vip" ? "VIP" : (seat.seatType || seat.type) === "couple" ? "Đôi" : "Thường"})
                          </Tag>
                        ))
                      ) : (
                        <Text type="secondary">Chưa liên kết ghế ngồi</Text>
                      )}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Combo đã chọn">
                    {selectedBookingDetails.combos && selectedBookingDetails.combos.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selectedBookingDetails.combos.map((item: any) => (
                          <div key={item._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 700 }}>{item.combo?.name || (item.combo && item.combo.name) || "Không xác định"} x{item.quantity}</div>
                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 0))}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text type="secondary">Không có combo</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái in vé">
                    {selectedBookingDetails.booking.printCount && selectedBookingDetails.booking.printCount > 0 ? (
                      <Tag color="cyan" style={{ fontWeight: 700, borderRadius: "4px" }}>
                        Đã in vé {selectedBookingDetails.booking.printCount} lần
                      </Tag>
                    ) : (
                      <Tag color="default" style={{ fontWeight: 700, borderRadius: "4px" }}>
                        Chưa in vé
                      </Tag>
                    )}
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: "20px 0" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <DollarOutlined style={{ color: "#e11d48" }} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>CHI TIẾT THANH TOÁN</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text type="secondary">Tiền ghế gốc</Text>
                    <Text strong>{formatCurrency(selectedBookingDetails.booking.totalSeatPrice || selectedBookingDetails.booking.finalAmount)}</Text>
                  </div>

                  {selectedBookingDetails.booking.voucher && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text type="secondary">Khuyến mại áp dụng</Text>
                      <Tag color="red" style={{ fontWeight: 600, margin: 0 }}>
                        {(selectedBookingDetails.booking.voucher as any).code} (-{formatCurrency(selectedBookingDetails.booking.discountAmount || 0)})
                      </Tag>
                    </div>
                  )}

                  <Divider style={{ margin: "8px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Khách thực trả</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#e11d48" }}>
                      {formatCurrency(selectedBookingDetails.booking.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom ticket stub with Barcode / QR simulator */}
              <div
                style={{
                  backgroundColor: "#fafafa",
                  padding: "24px 20px",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <BarcodeOutlined style={{ fontSize: 48, color: "#475569" }} />
                    <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", letterSpacing: "1px", marginTop: 4 }}>
                      *{selectedBookingDetails.booking._id.toUpperCase()}*
                    </span>
                  </div>
                  <div style={{ width: "1px", height: "50px", backgroundColor: "#e2e8f0" }} />
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Ticket QR Code"
                      style={{ width: "80px", height: "80px", border: "2px solid #fff", borderRadius: "4px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
                    />
                  ) : (
                    <QrcodeOutlined style={{ fontSize: 44, color: "#94a3b8" }} />
                  )}
                </div>
                <span style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", maxWidth: "280px" }}>
                  Hệ thống soát vé quét mã QR hoặc đối soát mã hóa đơn để cho phép vào phòng chiếu.
                </span>
              </div>
            </div>

            {/* Transaction Timeline */}
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HistoryOutlined style={{ color: "#e11d48" }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Lịch sử tiến trình vé</span>
                </div>
              }
              bordered={false}
              style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}
            >
              <Timeline
                style={{ marginTop: 8 }}
                items={[
                  {
                    color: "green",
                    children: (
                      <div>
                        <strong>Khởi tạo yêu cầu đặt vé</strong>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0 0" }}>
                          Đơn vé được lập bởi {selectedBookingDetails.booking.user?.fullName || "Khách vãng lai"} lúc{" "}
                          {dayjs(selectedBookingDetails.booking.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                        </p>
                      </div>
                    ),
                  },
                  {
                    color: selectedBookingDetails.booking.status !== "pending" ? "green" : "orange",
                    children: (
                      <div>
                        <strong>Trạng thái thanh toán</strong>
                        {selectedBookingDetails.booking.status === "pending" ? (
                          <p style={{ fontSize: 11, color: "#f59e0b", margin: "4px 0 0 0" }}>
                            Đang đợi hệ thống ghi nhận thanh toán (Momo/VNPay hoặc tiền mặt)...
                          </p>
                        ) : (
                          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0 0" }}>
                            Đơn vé đã được thanh toán thành công vào{" "}
                            {dayjs(selectedBookingDetails.booking.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                          </p>
                        )}
                      </div>
                    ),
                  },
                  ...(selectedBookingDetails.booking.status === "completed"
                    ? [
                      {
                        color: "blue" as const,
                        children: (
                          <div>
                            <strong>Hoàn tất soát vé (Đã sử dụng)</strong>
                            <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0 0" }}>
                              Khách hàng đã được soát vé vào rạp lúc{" "}
                              {dayjs(selectedBookingDetails.booking.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                            </p>
                          </div>
                        ),
                      },
                    ]
                    : []),
                  ...(selectedBookingDetails.booking.status === "cancelled"
                    ? [
                      {
                        color: "red" as const,
                        children: (
                          <div>
                            <strong>Đã hủy đơn đặt vé</strong>
                            <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0 0" }}>
                              Đơn đặt chỗ bị hủy tự động do hết hạn thanh toán hoặc thao tác hủy bởi quản trị viên.
                            </p>
                          </div>
                        ),
                      },
                    ]
                    : []),
                ]}
              />
            </Card>

            {/* Quick Actions Panel */}
            <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#475569" }}>Thao tác quản lý</span>
                <Space>
                  {(selectedBookingDetails.booking.status === "pending" ||
                    selectedBookingDetails.booking.status === "confirmed") && (
                      <Popconfirm
                        title="Bạn có chắc chắn muốn hủy đơn vé?"
                        description="Hành động này sẽ giải phóng toàn bộ ghế đã đặt."
                        onConfirm={() => void handleCancel(selectedBookingDetails.booking)}
                        okText="Hủy vé"
                        cancelText="Quay lại"
                        okButtonProps={{ danger: true }}
                      >
                        <Button type="primary" danger ghost icon={<CloseCircleOutlined />} loading={actionLoading}>
                          Hủy đặt vé
                        </Button>
                      </Popconfirm>
                    )}

                  {selectedBookingDetails.booking.status === "confirmed" && (
                    <Popconfirm
                      title="Xác nhận khách đã vào rạp?"
                      description="Nhấn đồng ý để hoàn tất soát vé đơn này."
                      onConfirm={() => void handleComplete(selectedBookingDetails.booking)}
                      okText="Xác nhận"
                      cancelText="Hủy bỏ"
                    >
                      <Button
                        type="primary"
                        style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
                        icon={<CheckCircleOutlined />}
                        loading={actionLoading}
                      >
                        Hoàn tất soát vé
                      </Button>
                    </Popconfirm>
                  )}

                  {(selectedBookingDetails.booking.status === "confirmed" ||
                    selectedBookingDetails.booking.status === "completed") && (
                      <Button
                        type="primary"
                        style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}
                        icon={<PrinterOutlined />}
                        onClick={handlePrintConfirm}
                      >
                        In vé
                      </Button>
                    )}

                  <Button onClick={() => setDrawerOpen(false)}>Đóng</Button>
                </Space>
              </div>
            </Card>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "350px" }}>
            <Result
              status="warning"
              title="Không tìm thấy chi tiết vé"
              subTitle="Vui lòng thử lại hoặc liên hệ quản trị hệ thống."
            />
          </div>
        )}
      </Drawer>

      {/* QR Code Scanner Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <QrcodeOutlined style={{ color: "#10b981", fontSize: 20 }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>QUÉT MÃ QR SOÁT VÉ</span>
          </div>
        }
        open={scannerModalOpen}
        onCancel={() => setScannerModalOpen(false)}
        footer={null}
        destroyOnClose
        afterOpenChange={(open) => {
          if (open) {
            void startScanner();
          } else {
            void stopScanner();
          }
        }}
        styles={{
          body: { padding: "20px 24px" }
        }}
      >
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <div
            id="reader"
            style={{
              width: "100%",
              maxWidth: "400px",
              margin: "0 auto",
              overflow: "hidden",
              borderRadius: "12px",
              border: "1px dashed #cbd5e1",
              backgroundColor: "#f8fafc"
            }}
          />
          <p style={{ marginTop: 16, color: "#64748b", fontWeight: 500, fontSize: 13 }}>
            Đưa mã QR trên vé của khách hàng vào khung hình camera để quét soát vé tự động.
          </p>
        </div>
      </Modal>
    </section>
  );
}

export default ManageBooking;
