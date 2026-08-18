import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Card,
  Typography,
  Drawer,
  Descriptions,
  Divider,
  Row,
  Col,
  Spin,
  Timeline,
  Result,
  Modal,
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  BarcodeOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../services/api";
import QRCode from "qrcode";

const { Title, Text } = Typography;
const { Option } = Select;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

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

export function StaffBookings() {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Booking Drawer
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      const list = res.data?.data || res.data || [];
      setBookings(list);
    } catch {
      void message.error("Lỗi khi tải danh sách vé/đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => {
      const matchSearch =
        !searchText ||
        item.bookingCode?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.customerPhone?.includes(searchText) ||
        item.user?.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.user?.phone?.includes(searchText) ||
        item.showtime?.movie?.title?.toLowerCase().includes(searchText.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [bookings, searchText, statusFilter]);

  const handleOpenDetail = async (record: any) => {
    setDrawerVisible(true);
    setLoadingDetails(true);
    setSelectedBookingDetails(null);
    setQrCodeUrl("");

    try {
      const res = await api.get(`/bookings/${record._id}`);
      const detail = res.data?.data || res.data || record;
      setSelectedBookingDetails(detail);

      const booking = detail.booking || detail;
      if (booking && (booking.status === "confirmed" || booking.status === "completed")) {
        const ticketData = {
          bookingId: booking._id,
          bookingCode: booking.bookingCode,
          movie: booking.showtime?.movie?.title,
          cinema: booking.showtime?.cinema?.name || "Rạp Lumora",
          room: booking.showtime?.room?.name,
          time: booking.showtime?.startTime,
          seats: (detail.seats || []).map((s: any) => s.seatCode),
        };
        const url = await QRCode.toDataURL(JSON.stringify(ticketData));
        setQrCodeUrl(url);
      }
    } catch {
      void message.error("Không thể tải chi tiết vé");
      setDrawerVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/complete`);
      void message.success("Soát vé thành công!");
      fetchBookings();
      // Reload detail
      if (selectedBookingDetails) {
        const booking = selectedBookingDetails.booking || selectedBookingDetails;
        await handleOpenDetail(booking);
      }
    } catch (err: any) {
      void message.error(err.response?.data?.message || "Không thể soát vé");
    } finally {
      setActionLoading(false);
    }
  };

  const executePrint = async (bookingDetails: any) => {
    const booking = bookingDetails.booking || bookingDetails;
    const seats = bookingDetails.seats || [];

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
    const seatCount = seats.length || 1;

    let ticketHTML = `
      <html>
      <head>
        <title>In Vé Xem Phim - ${bookingCode}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #000000; }
          .tickets-container { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px; }
          .ticket { width: 650px; border: 2px solid #000000; border-radius: 12px; display: flex; flex-direction: row; overflow: hidden; box-sizing: border-box; page-break-after: always; break-after: page; }
          .ticket-main { flex: 7; padding: 20px; border-right: 2px dashed #000000; position: relative; }
          .ticket-stub { flex: 3; padding: 20px; background-color: #fafafa; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; }
          .ticket-header { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 2px solid #000000; padding-bottom: 6px; }
          .movie-title { font-size: 20px; font-weight: 900; margin: 8px 0; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px; }
          .info-item { display: flex; flex-direction: column; }
          .info-label { font-size: 10px; text-transform: uppercase; color: #555555; font-weight: 600; }
          .info-value { font-size: 14px; font-weight: 800; }
          .seat-highlight { font-size: 24px; font-weight: 900; background-color: #000000; color: #ffffff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
          .stub-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #555555; }
          .stub-seat { font-size: 28px; font-weight: 900; margin: 10px 0; }
          .stub-info { font-size: 11px; font-weight: 600; }
          .ticket-index { font-size: 11px; font-weight: 600; border: 1px solid #000000; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; }
          @media print { body { background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .tickets-container { padding: 0; gap: 0; } .ticket { border: 2px solid #000000; margin-bottom: 0; page-break-after: always; break-after: page; } }
        </style>
      </head>
      <body><div class="tickets-container">
    `;

    seats.forEach((seat: any, index: number) => {
      const seatCode = seat.seatCode || seat.seat?.code || seat.code || seat.label || (seat.row && seat.col ? `${seat.row}${seat.col}` : (seat.row && seat.number ? `${seat.row}${seat.number}` : "-"));
      const seatTypeLabel = (seat.seatType || seat.seat?.type || seat.type) === "vip" ? "VIP" : (seat.seatType || seat.seat?.type || seat.type) === "couple" ? "Đôi" : "Thường";
      const seatPrice = seat.price || (basePrice * (seat.priceMultiplier || 1));

      ticketHTML += `
        <div class="ticket">
          <div class="ticket-main">
            <div class="ticket-header">${cinemaName}</div>
            <div class="movie-title">${movieTitle}</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Suất Chiếu</span><span class="info-value">${startTime}</span></div>
              <div class="info-item"><span class="info-label">Phòng Chiếu</span><span class="info-value">${roomName}</span></div>
              <div class="info-item"><span class="info-label">Loại Ghế</span><span class="info-value">${seatTypeLabel}</span></div>
              <div class="info-item"><span class="info-label">Mã Giao Dịch</span><span class="info-value" style="font-family: monospace;">${bookingCode}</span></div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div class="info-item"><span class="info-label">Ghế Ngồi</span><span class="seat-highlight">${seatCode}</span></div>
              <div class="info-item" style="text-align: right;"><span class="info-label">Giá Vé</span><span class="info-value">${seatPrice.toLocaleString("vi-VN")}đ</span></div>
            </div>
          </div>
          <div class="ticket-stub">
            <div><div class="ticket-index">VÉ ${index + 1} / ${seatCount}</div><div class="stub-title">SOÁT VÉ</div></div>
            <div class="stub-seat">${seatCode}</div>
            <div><div class="stub-info">${roomName}</div><div class="stub-info" style="font-size: 9px; color: #555555; margin-top: 4px;">${startTime}</div></div>
          </div>
        </div>
      `;
    });

    ticketHTML += `</div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);};</script></body></html>`;
    printWindow.document.write(ticketHTML);
    printWindow.document.close();

    try {
      await api.patch(`/bookings/${booking._id}/print`);
      setSelectedBookingDetails((prev: any) => {
        if (!prev) return null;
        const b = prev.booking || prev;
        if (prev.booking) {
          return { ...prev, booking: { ...prev.booking, printCount: (b.printCount || 0) + 1 } };
        }
        return { ...prev, printCount: (b.printCount || 0) + 1 };
      });
      void message.success("Đã ghi nhận in vé thành công!");
      fetchBookings();
    } catch {
      void message.error("Không thể cập nhật số lần in vé trên máy chủ.");
    }
  };

  const handlePrintConfirm = () => {
    if (!selectedBookingDetails) return;
    const booking = selectedBookingDetails.booking || selectedBookingDetails;
    const printCount = booking.printCount || 0;

    if (printCount > 0) {
      Modal.confirm({
        title: "Xác nhận in lại vé?",
        content: `Vé này đã được in ${printCount} lần trước đó. Bạn có chắc chắn muốn in lại không?`,
        okText: "Đồng ý in lại",
        cancelText: "Hủy bỏ",
        okButtonProps: { type: "primary" },
        onOk: () => { void executePrint(selectedBookingDetails); },
      });
    } else {
      void executePrint(selectedBookingDetails);
    }
  };

  const columns = [
    {
      title: "Mã Đơn / Barcode",
      dataIndex: "bookingCode",
      key: "bookingCode",
      render: (code: string) => (
        <Text strong style={{ color: "#2563eb" }}>{code}</Text>
      ),
    },
    {
      title: "Khách Hàng",
      key: "customer",
      render: (_: any, record: any) => (
        <div>
          <div>{record.user?.fullName || record.customerName || "Khách tại quầy"}</div>
          {(record.user?.phone || record.customerPhone) && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.phone || record.customerPhone}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Phim & Suất Chiếu",
      key: "showtime",
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.showtime?.movie?.title || "Phim Rạp"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Phòng: {record.showtime?.room?.name} •{" "}
            {dayjs(record.showtime?.startTime).format("HH:mm - DD/MM")}
          </Text>
        </div>
      ),
    },
    {
      title: "Tổng Tiền",
      dataIndex: "finalAmount",
      key: "finalAmount",
      render: (amount: number) => (
        <Text type="success" strong>{amount?.toLocaleString("vi-VN")} đ</Text>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => statusTag(status),
    },
    {
      title: "Hành Động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(record)}
          >
            Chi tiết
          </Button>

          {record.status === "confirmed" && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCheckIn(record._id)}
              style={{ background: "#10b981", borderColor: "#10b981" }}
            >
              Soát vé
            </Button>
          )}

          {(record.status === "confirmed" || record.status === "completed") && (
            <Button
              type="default"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handleOpenDetail(record)}
            >
              In vé
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Helper to get booking object from selectedBookingDetails
  const getBooking = () => selectedBookingDetails?.booking || selectedBookingDetails;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        .ticket-stub-staff {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          position: relative;
        }
        .ticket-notch-left-staff, .ticket-notch-right-staff {
          width: 20px;
          height: 20px;
          background: #f1f5f9;
          border-radius: 50%;
          position: absolute;
          bottom: 120px;
          z-index: 5;
        }
        .ticket-notch-left-staff { left: -10px; border-right: 1px solid #e2e8f0; }
        .ticket-notch-right-staff { right: -10px; border-left: 1px solid #e2e8f0; }
      `}</style>

      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0f172a",
          padding: "20px 24px",
          borderRadius: 12,
          color: "white",
        }}
      >
        <div>
          <Title level={4} style={{ color: "white", margin: 0 }}>
            Tra Cứu & Quản Lý Vé Tại Quầy
          </Title>
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>
            Tìm kiếm theo mã vé, số điện thoại khách hàng, in lại vé và xác nhận soát vé nhanh
          </Text>
        </div>

        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchBookings}>
          Tải Lại Danh Sách
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Nhập mã vé (BookingCode), tên khách hàng, số điện thoại hoặc tên phim..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} md={10}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <FilterOutlined style={{ color: "#64748b" }} />
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                style={{ width: 180 }}
              >
                <Option value="all">Tất cả trạng thái</Option>
                <Option value="confirmed">Đã thanh toán (Chờ soát)</Option>
                <Option value="completed">Đã soát vé</Option>
                <Option value="pending">Chờ thanh toán</Option>
                <Option value="cancelled">Đã hủy</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table List */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={filteredBookings}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Detail Drawer — giống ManageBooking */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarcodeOutlined style={{ color: "#e11d48", fontSize: 22 }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>CHI TIẾT VÉ XEM PHIM</span>
          </div>
        }
        width={540}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        styles={{
          body: { padding: "20px 24px", backgroundColor: "#f1f5f9" },
          header: { borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" },
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
            <div className="ticket-stub-staff">
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
                      {getBooking()?.showtime?.movie?.title || "Phim chưa xác định"}
                    </h3>
                  </div>
                  {statusTag(getBooking()?.status || "")}
                </div>

                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: "24px 32px" }}>
                  <div>
                    <span style={{ fontSize: 9, opacity: 0.75, display: "block", fontWeight: 700, letterSpacing: "0.5px" }}>RẠP CHIẾU</span>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      {getBooking()?.showtime?.cinema?.name || "Rạp chiếu"}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, opacity: 0.75, display: "block", fontWeight: 700, letterSpacing: "0.5px" }}>PHÒNG CHIẾU</span>
                    <span style={{ fontWeight: 800, fontSize: 13 }}>
                      {getBooking()?.showtime?.room?.name || "Phòng"}
                    </span>
                  </div>
                </div>

                <div className="ticket-notch-left-staff" />
                <div className="ticket-notch-right-staff" />
              </div>

              {/* Dotted separator */}
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
                      {getBooking()?.bookingCode || getBooking()?._id}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian giao dịch">
                    {dayjs(getBooking()?.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Khách hàng">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <UserOutlined style={{ fontSize: 12, color: "#e11d48" }} />
                      {getBooking()?.user?.fullName || "Khách vãng lai"}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Liên hệ">
                    {getBooking()?.user?.email}{getBooking()?.user?.phone && ` · ${getBooking()?.user?.phone}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lịch bắt đầu phim">
                    <span style={{ color: "#e11d48", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <CalendarOutlined />
                      {getBooking()?.showtime?.startTime
                        ? dayjs(getBooking()?.showtime?.startTime).format("DD/MM/YYYY HH:mm")
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
                            {seat.seatCode || seat.seat?.code || seat.code || seat.label || (seat.row && seat.col ? `${seat.row}${seat.col}` : (seat.row && seat.number ? `${seat.row}${seat.number}` : "-"))} ({(seat.seatType || seat.seat?.type || seat.type) === "vip" ? "VIP" : (seat.seatType || seat.seat?.type || seat.type) === "couple" ? "Đôi" : "Thường"})
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
                            <div style={{ fontWeight: 700 }}>{item.combo?.name || "Không xác định"} x{item.quantity}</div>
                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 0))}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text type="secondary">Không có combo</Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái in vé">
                    {getBooking()?.printCount && getBooking()?.printCount > 0 ? (
                      <Tag color="cyan" style={{ fontWeight: 700, borderRadius: "4px" }}>
                        Đã in vé {getBooking()?.printCount} lần
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
                    <Text strong>{formatCurrency(getBooking()?.totalSeatPrice || getBooking()?.finalAmount || 0)}</Text>
                  </div>

                  {getBooking()?.voucher && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Text type="secondary">Khuyến mại áp dụng</Text>
                      <Tag color="red" style={{ fontWeight: 600, margin: 0 }}>
                        {(getBooking()?.voucher as any)?.code} (-{formatCurrency(getBooking()?.discountAmount || 0)})
                      </Tag>
                    </div>
                  )}

                  <Divider style={{ margin: "8px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Khách thực trả</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#e11d48" }}>
                      {formatCurrency(getBooking()?.finalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom ticket stub with Barcode / QR */}
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
                      *{(getBooking()?._id || "").toUpperCase()}*
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
                          Đơn vé được lập bởi {getBooking()?.user?.fullName || "Khách vãng lai"} lúc{" "}
                          {dayjs(getBooking()?.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                        </p>
                      </div>
                    ),
                  },
                  {
                    color: getBooking()?.status !== "pending" ? "green" : "orange",
                    children: (
                      <div>
                        <strong>Trạng thái thanh toán</strong>
                        {getBooking()?.status === "pending" ? (
                          <p style={{ fontSize: 11, color: "#f59e0b", margin: "4px 0 0 0" }}>
                            Đang đợi hệ thống ghi nhận thanh toán (Momo/VNPay hoặc tiền mặt)...
                          </p>
                        ) : (
                          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0 0" }}>
                            Đơn vé đã được thanh toán thành công vào{" "}
                            {dayjs(getBooking()?.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                          </p>
                        )}
                      </div>
                    ),
                  },
                  ...(getBooking()?.status === "completed"
                    ? [{
                      color: "blue" as const,
                      children: (
                        <div>
                          <strong>Hoàn tất soát vé (Đã sử dụng)</strong>
                          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0 0" }}>
                            Khách hàng đã được soát vé vào rạp lúc{" "}
                            {dayjs(getBooking()?.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                          </p>
                        </div>
                      ),
                    }]
                    : []),
                  ...(getBooking()?.status === "cancelled"
                    ? [{
                      color: "red" as const,
                      children: (
                        <div>
                          <strong>Đã hủy đơn đặt vé</strong>
                          <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0 0" }}>
                            Đơn đặt chỗ bị hủy tự động do hết hạn thanh toán hoặc thao tác hủy bởi quản trị viên.
                          </p>
                        </div>
                      ),
                    }]
                    : []),
                ]}
              />
            </Card>

            {/* Quick Actions Panel */}
            <Card bordered={false} style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#475569" }}>Thao tác nhanh</span>
                <Space>
                  {getBooking()?.status === "confirmed" && (
                    <Button
                      type="primary"
                      style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
                      icon={<CheckCircleOutlined />}
                      loading={actionLoading}
                      onClick={() => handleCheckIn(getBooking()?._id)}
                    >
                      Hoàn tất soát vé
                    </Button>
                  )}

                  {(getBooking()?.status === "confirmed" || getBooking()?.status === "completed") && (
                    <Button
                      type="primary"
                      style={{ backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}
                      icon={<PrinterOutlined />}
                      onClick={handlePrintConfirm}
                    >
                      In vé
                    </Button>
                  )}

                  <Button
                    danger
                    ghost
                    icon={<CloseCircleOutlined />}
                    onClick={() => setDrawerVisible(false)}
                  >
                    Đóng
                  </Button>
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
    </div>
  );
}

export default StaffBookings;
