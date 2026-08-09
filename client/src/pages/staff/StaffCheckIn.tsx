import { useState, useEffect, useRef } from "react";
import {
  Card,
  Input,
  Button,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Descriptions,
  Result,
  Spin,
  Alert,
  Divider,
} from "antd";
import {
  QrcodeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import QRCode from "qrcode";

const { Title, Text } = Typography;

export function StaffCheckIn() {
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [bookingSeats, setBookingSeats] = useState<any[]>([]);
  const [bookingCombos, setBookingCombos] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSearch = async (queryCode?: string) => {
    const code = (queryCode || searchInput).trim();
    if (!code) {
      toast.warning("Vui lòng nhập mã vé hoặc mã đơn hàng!");
      return;
    }

    setSearching(true);
    setBooking(null);
    setBookingSeats([]);
    setBookingCombos([]);
    setCheckInSuccess(false);

    try {
      // Fetch all bookings or search by ID/code
      const res = await api.get("/bookings");
      const list: any[] = res.data?.data || res.data || [];

      const cleanCode = code.toUpperCase();
      const found = list.find(
        (b) =>
          b.bookingCode?.toUpperCase() === cleanCode ||
          b._id === cleanCode ||
          b._id?.toLowerCase() === code.toLowerCase() ||
          b.customerPhone?.includes(code) ||
          b.user?.phone?.includes(code) ||
          b.customerName?.toLowerCase().includes(code.toLowerCase())
      );

      if (!found) {
        toast.error("Không tìm thấy mã vé / đơn hàng này!");
        setSearching(false);
        return;
      }

      // Fetch detail booking with seats
      const detailRes = await api.get(`/bookings/${found._id}`);
      const detailData = detailRes.data?.data || detailRes.data;

      setBooking(detailData?.booking || detailData || found);
      setBookingSeats(detailData?.seats || []);
      setBookingCombos(detailData?.combos || []);

      // Generate QR
      const qrData = await QRCode.toDataURL(found.bookingCode || found._id);
      setQrCodeUrl(qrData);

      toast.success("Đã tìm thấy thông tin vé!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tra cứu mã vé");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!booking?._id) return;

    if (booking.status === "completed") {
      toast.warning("Vé này đã được soát vé trước đó!");
      return;
    }

    if (booking.status === "cancelled" || booking.status === "expired") {
      toast.error("Vé này đã bị hủy hoặc hết hạn, không thể soát vé!");
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch(`/bookings/${booking._id}/complete`);
      const updated = res.data?.data || res.data;

      setBooking((prev: any) => ({
        ...prev,
        status: "completed",
        checkedInAt: updated?.checkedInAt || new Date().toISOString(),
      }));

      setCheckInSuccess(true);
      toast.success("SOÁT VÉ THÀNH CÔNG! KHÁCH CÓ THỂ VÀO PHÓNG CHIẾU 🎉");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không thể thực hiện soát vé");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchInput("");
    setBooking(null);
    setBookingSeats([]);
    setBookingCombos([]);
    setCheckInSuccess(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          padding: "24px 32px",
          borderRadius: 16,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 20px rgba(49, 46, 129, 0.2)",
        }}
      >
        <div>
          <Title level={3} style={{ color: "white", margin: 0 }}>
            Quản Lý Soát Vé & Quét Mã QR Cửa 🎫
          </Title>
          <Text style={{ color: "#c7d2fe" }}>
            Kiểm tra tính hợp lệ của vé, kiểm tra phòng chiếu và xác nhận cho khách vào phòng
          </Text>
        </div>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={handleReset}
          style={{ background: "#4338ca", color: "white", borderColor: "#6366f1" }}
        >
          Nhập Mã Mới
        </Button>
      </div>

      {/* Search Bar / QR Input */}
      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={18}>
            <Input
              ref={inputRef}
              size="large"
              prefix={<QrcodeOutlined style={{ fontSize: 22, color: "#6366f1" }} />}
              placeholder="Nhập hoặc quét Mã Booking (VD: LUMORA-XXXX), SĐT khách hàng..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => handleSearch()}
              allowClear
              style={{ fontSize: 16 }}
            />
          </Col>

          <Col xs={24} md={6}>
            <Button
              type="primary"
              size="large"
              block
              icon={<SearchOutlined />}
              loading={searching}
              onClick={() => handleSearch()}
              style={{
                height: 48,
                background: "#4f46e5",
                borderColor: "#4f46e5",
                fontWeight: "bold",
              }}
            >
              Kiểm Tra Vé
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Result Display Area */}
      {searching ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" tip="Đang truy xuất dữ liệu vé rạp..." />
        </div>
      ) : !booking ? (
        <Card style={{ textAlign: "center", padding: "50px 20px", borderRadius: 12 }}>
          <ScanOutlined style={{ fontSize: 64, color: "#94a3b8" }} />
          <Title level={4} style={{ color: "#64748b", marginTop: 16 }}>
            Vui lòng nhập hoặc quét mã vé để bắt đầu soát vé
          </Title>
          <Text type="secondary">
            Đầu quét mã barcode/QR sẽ tự động điền mã vé vào thanh tìm kiếm trên.
          </Text>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {/* Main Ticket Information */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Thông Tin Chi Tiết Vé #{booking.bookingCode}</span>
                  {booking.status === "completed" ? (
                    <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>
                      <CheckCircleOutlined /> ĐÃ SOÁT VÉ
                    </Tag>
                  ) : booking.status === "confirmed" ? (
                    <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
                      <ClockCircleOutlined /> VÉ HỢP LỆ - ĐỜI SOÁT
                    </Tag>
                  ) : (
                    <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>
                      <CloseCircleOutlined /> VÉ KHÔNG HỢP LỆ ({booking.status})
                    </Tag>
                  )}
                </div>
              }
              style={{ borderRadius: 12 }}
            >
              {checkInSuccess && (
                <Alert
                  message="SOÁT VÉ THÀNH CÔNG 🎉"
                  description={`Vé đã được xác nhận vào phòng lúc ${dayjs(booking.checkedInAt).format("HH:mm:ss - DD/MM/YYYY")}. Chúc khách hàng xem phim vui vẻ!`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
              )}

              <Descriptions title="Tên Phim & Lịch Chiếu" bordered column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Phim">
                  <Text strong style={{ fontSize: 16, color: "#1e1b4b" }}>
                    {booking.showtime?.movie?.title || "Phim Rạp Lumora"}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Phòng Chiếu">
                  <Tag color="purple" style={{ fontSize: 14 }}>
                    {booking.showtime?.room?.name || "Phòng chiếu"}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Suất Chiếu">
                  <Text strong style={{ color: "#2563eb" }}>
                    {dayjs(booking.showtime?.startTime).format("DD/MM/YYYY - HH:mm")}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item label="Thời Lượng">
                  {booking.showtime?.movie?.duration || 120} phút
                </Descriptions.Item>

                <Descriptions.Item label="Danh Sách Ghế" span={2}>
                  <Space wrap size={[8, 8]}>
                    {bookingSeats.length > 0
                      ? bookingSeats.map((bs) => (
                        <Tag key={bs._id || bs.seat?._id} color="volcano" style={{ fontSize: 15, padding: "4px 10px" }}>
                          Ghế {bs.seat?.code || bs.code}
                        </Tag>
                      ))
                      : "Chưa cập nhật thông tin ghế"}
                  </Space>
                </Descriptions.Item>

                {bookingCombos.length > 0 && (
                  <Descriptions.Item label="Combo Đính Kèm" span={2}>
                    <Space wrap>
                      {bookingCombos.map((bc) => (
                        <Tag key={bc._id} color="gold">
                          {bc.combo?.name} (x{bc.quantity})
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Divider style={{ margin: "20px 0" }} />

              <Descriptions title="Thông Tin Khách Hàng & Thanh Toán" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Họ tên">
                  {booking.user?.fullName || "Khách vãng lai"}
                </Descriptions.Item>
                <Descriptions.Item label="SĐT">
                  {booking.user?.phone || "Khách tại quầy"}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng giá trị">
                  <Text type="success" strong style={{ fontSize: 16 }}>
                    {booking.finalAmount?.toLocaleString("vi-VN")} đ
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái in">
                  {booking.printStatus === "printed" ? (
                    <Tag color="green">Đã in vé giấy</Tag>
                  ) : (
                    <Tag color="default">Chưa in vé</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Verification Action Panel */}
          <Col xs={24} lg={8}>
            <Card title="Xác Nhận Soát Vé Cửa" style={{ borderRadius: 12, textAlign: "center" }}>
              {qrCodeUrl && (
                <div style={{ marginBottom: 16 }}>
                  <img src={qrCodeUrl} alt="QR Code Vé" style={{ width: 150, height: 150 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Mã Booking: {booking.bookingCode}
                    </Text>
                  </div>
                </div>
              )}

              {booking.status === "completed" ? (
                <Result
                  status="success"
                  title="Vé Đã Được Soát"
                  subTitle={`Vé này đã qua cổng soát lúc ${dayjs(booking.checkedInAt).format("HH:mm DD/MM")}`}
                />
              ) : booking.status === "cancelled" ? (
                <Result
                  status="error"
                  title="Vé Đã Bị Hủy"
                  subTitle="Không thể duyệt cho khách vào phòng chiếu với vé này."
                />
              ) : (
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CheckCircleOutlined style={{ fontSize: 20 }} />}
                  loading={loading}
                  onClick={handleConfirmCheckIn}
                  style={{
                    height: 56,
                    background: "#10b981",
                    borderColor: "#10b981",
                    fontSize: 16,
                    fontWeight: "bold",
                    borderRadius: 10,
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  XÁC NHẬN CHO VÀO PHÒNG
                </Button>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default StaffCheckIn;
