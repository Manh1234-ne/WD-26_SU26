import { useEffect, useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Select,
  Button,
  Tag,
  Typography,
  Space,
  Input,
  InputNumber,
  Spin,
  Modal,
  Badge,
  Radio,
  Divider,
  Result,
} from "antd";
import {
  ShoppingOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  DollarOutlined,
  BarcodeOutlined,
  CreditCardOutlined,
  CoffeeOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useSearchParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import QRCode from "qrcode";
import { useAuthStore } from "../../features/auth/auth.store";

const { Title, Text } = Typography;
const { Option } = Select;

interface Movie {
  _id: string;
  title: string;
  poster: string;
  duration: number;
}

interface Showtime {
  _id: string;
  movie: Movie;
  room: { _id: string; name: string };
  startTime: string;
  endTime: string;
  price: number;
}

interface Seat {
  _id: string;
  code: string;
  row: string;
  number: number;
  type: "standard" | "vip" | "couple" | "disabled";
  priceMultiplier: number;
  isActive: boolean;
}

interface Combo {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
}

export function StaffPos() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: staffUser } = useAuthStore();
  const queryShowtimeId = searchParams.get("showtimeId");

  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<string>("");
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>("");
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);

  // Seat & Occupied data
  const [seats, setSeats] = useState<Seat[]>([]);
  const [occupiedSeatIds, setOccupiedSeatIds] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);

  // Combos data
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<{ [comboId: string]: number }>({});

  // Customer info & Payment method
  const [customerName, setCustomerName] = useState<string>("Khách vãng lai");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [moviesRes, showtimesRes, combosRes] = await Promise.all([
          api.get("/movies"),
          api.get("/showtimes"),
          api.get("/combos"),
        ]);

        const mList: Movie[] = moviesRes.data?.data || moviesRes.data || [];
        const sList: Showtime[] = showtimesRes.data?.data || showtimesRes.data || [];
        const cList: Combo[] = combosRes.data?.data || combosRes.data || [];

        setMovies(mList);
        setShowtimes(sList);
        setCombos(cList);

        if (queryShowtimeId) {
          const found = sList.find((st) => st._id === queryShowtimeId);
          if (found) {
            setSelectedMovieId(found.movie._id);
            setSelectedShowtimeId(found._id);
            setSelectedShowtime(found);
          }
        }
      } catch (err) {
        toast.error("Lỗi khi tải dữ liệu bán vé tại quầy");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [queryShowtimeId]);

  // Filter showtimes by selected movie
  const filteredShowtimes = useMemo(() => {
    if (!selectedMovieId) return [];
    return showtimes.filter((st) => st.movie?._id === selectedMovieId);
  }, [showtimes, selectedMovieId]);

  // Load seats when selectedShowtimeId changes
  useEffect(() => {
    if (!selectedShowtimeId) {
      setSeats([]);
      setOccupiedSeatIds([]);
      setSelectedSeats([]);
      setSelectedShowtime(null);
      return;
    }

    const st = showtimes.find((s) => s._id === selectedShowtimeId);
    setSelectedShowtime(st || null);

    if (st?.room?._id) {
      setLoading(true);
      Promise.all([
        api.get(`/seats/room/${st.room._id}`),
        api.get(`/booking-seats/showtime/${selectedShowtimeId}/occupied`),
      ])
        .then(([seatsRes, occRes]) => {
          const seatArr = seatsRes.data?.data || seatsRes.data || [];
          const occArr = occRes.data?.data || occRes.data || [];
          setSeats(seatArr);
          setOccupiedSeatIds(
            occArr.map((item: any) => item.seat?._id || item.seat || item)
          );
        })
        .catch(() => {
          toast.error("Không thể tải sơ đồ ghế");
        })
        .finally(() => setLoading(false));
    }
  }, [selectedShowtimeId, showtimes]);

  // Handle seat click
  const handleToggleSeat = (seat: Seat) => {
    if (occupiedSeatIds.includes(seat._id)) {
      toast.warning(`Ghế ${seat.code} đã được đặt trước!`);
      return;
    }
    if (selectedSeats.find((s) => s._id === seat._id)) {
      setSelectedSeats(selectedSeats.filter((s) => s._id !== seat._id));
    } else {
      if (selectedSeats.length >= 10) {
        toast.warning("Chỉ được chọn tối đa 10 ghế trong 1 giao dịch quầy");
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  // Group seats by row
  const seatRows = useMemo(() => {
    const map: { [row: string]: Seat[] } = {};
    seats.forEach((seat) => {
      if (!map[seat.row]) map[seat.row] = [];
      map[seat.row].push(seat);
    });
    // Sort seats in each row by number
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => a.number - b.number);
    });
    return map;
  }, [seats]);

  // Price calculations
  const seatTotalPrice = useMemo(() => {
    if (!selectedShowtime) return 0;
    const basePrice = selectedShowtime.price || 0;
    return selectedSeats.reduce((acc, seat) => {
      const multiplier = seat.priceMultiplier || (seat.type === "vip" ? 1.2 : seat.type === "couple" ? 2 : 1);
      return acc + basePrice * multiplier;
    }, 0);
  }, [selectedSeats, selectedShowtime]);

  const comboTotalPrice = useMemo(() => {
    return Object.entries(selectedCombos).reduce((acc, [cId, qty]) => {
      const combo = combos.find((c) => c._id === cId);
      return acc + (combo ? combo.price * qty : 0);
    }, 0);
  }, [selectedCombos, combos]);

  const grandTotal = seatTotalPrice + comboTotalPrice;

  // Handle Complete Booking
  const handleCreateCounterBooking = async () => {
    if (!selectedShowtimeId) {
      toast.error("Vui lòng chọn suất chiếu!");
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ghế!");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Prepare combos array
      const comboItems = Object.entries(selectedCombos)
        .filter(([_, qty]) => qty > 0)
        .map(([cId, qty]) => ({ combo: cId, quantity: qty }));

      // 2. Create booking payload
      const payload = {
        showtime: selectedShowtimeId,
        seatIds: selectedSeats.map((s) => s._id),
        combos: comboItems,
        customerName: customerName || "Khách vãng lai",
        customerPhone: customerPhone || "",
        paymentMethod: paymentMethod,
        isCounterSale: true,
      };

      const res = await api.post("/bookings", payload);
      const bookingData = res.data?.data || res.data;

      // 3. Automatically complete booking for POS cash/counter payment
      let finalBooking = bookingData;
      if (bookingData?._id) {
        try {
          const completeRes = await api.patch(`/bookings/${bookingData._id}/complete`);
          finalBooking = completeRes.data?.data || completeRes.data || bookingData;
        } catch {
          // Keep base booking if complete patch auto-handled by server
        }
      }

      // Generate QR code for receipt
      const bookingCode = finalBooking?.bookingCode || bookingData?._id || "LUMORA-POS";
      const qrData = await QRCode.toDataURL(bookingCode);

      setQrCodeDataUrl(qrData);
      setCreatedBooking(finalBooking);
      setPrintModalVisible(true);
      toast.success("Tạo đơn vé quầy thành công!");

      // Refresh occupied seats
      setOccupiedSeatIds([...occupiedSeatIds, ...selectedSeats.map((s) => s._id)]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi tạo đơn vé quầy");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPosState = () => {
    setSelectedSeats([]);
    setSelectedCombos({});
    setCustomerName("Khách vãng lai");
    setCustomerPhone("");
    setPrintModalVisible(false);
    setCreatedBooking(null);
  };

  if (loading && !seats.length && !movies.length) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải dữ liệu Máy POS Bán Vé..." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0f172a",
          padding: "16px 24px",
          borderRadius: 12,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShoppingOutlined style={{ fontSize: 24, color: "#10b981" }} />
          <div>
            <Title level={4} style={{ color: "white", margin: 0 }}>
              Hệ Thống Bán Vé Quầy (POS Terminal)
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Nhân viên lập vé trực tiếp • Ca làm việc: {staffUser?.fullName}
            </Text>
          </div>
        </div>

        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={resetPosState}
          style={{ background: "#334155", color: "white", borderColor: "#475569" }}
        >
          Làm Mới Đơn Bán
        </Button>
      </div>

      <Row gutter={[20, 20]}>
        {/* Left Column: Movie, Showtime & Seat Selection */}
        <Col xs={24} lg={15} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Step 1: Select Movie & Showtime */}
          <Card title="1 🎬 Chọn Phim & Suất Chiếu" style={{ borderRadius: 12 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Chọn Phim Rạp:</Text>
                <Select
                  showSearch
                  placeholder="-- Chọn Phim --"
                  style={{ width: "100%", marginTop: 6 }}
                  value={selectedMovieId || undefined}
                  onChange={(mId) => {
                    setSelectedMovieId(mId);
                    setSelectedShowtimeId("");
                  }}
                  optionFilterProp="children"
                >
                  {movies.map((m) => (
                    <Option key={m._id} value={m._id}>
                      {m.title} ({m.duration} phút)
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} md={12}>
                <Text strong>Suất Chiếu Trong Ngày:</Text>
                <Select
                  placeholder="-- Chọn Suất Chiếu --"
                  style={{ width: "100%", marginTop: 6 }}
                  value={selectedShowtimeId || undefined}
                  onChange={(sId) => setSelectedShowtimeId(sId)}
                  disabled={!selectedMovieId}
                >
                  {filteredShowtimes.map((st) => (
                    <Option key={st._id} value={st._id}>
                      [{dayjs(st.startTime).format("HH:mm")}] Phòng {st.room?.name} -{" "}
                      {st.price?.toLocaleString("vi-VN")}đ
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </Card>

          {/* Step 2: Interactive Seat Map */}
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>2 💺 Sơ Đồ Chọn Ghế ({selectedSeats.length} ghế đã chọn)</span>
                {selectedShowtime && (
                  <Tag color="purple">
                    Phòng: {selectedShowtime.room?.name} | Giá gốc:{" "}
                    {selectedShowtime.price?.toLocaleString("vi-VN")}đ
                  </Tag>
                )}
              </div>
            }
            style={{ borderRadius: 12 }}
          >
            {!selectedShowtimeId ? (
              <Result status="info" title="Vui lòng chọn phim và suất chiếu để mở sơ đồ ghế." />
            ) : loading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin tip="Đang tải sơ đồ ghế phòng chiếu..." />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Screen representation */}
                <div
                  style={{
                    width: "80%",
                    height: 28,
                    background: "linear-gradient(180deg, #94a3b8 0%, #cbd5e1 100%)",
                    borderRadius: "0 0 50% 50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#334155",
                    marginBottom: 30,
                    boxShadow: "0 4px 12px rgba(148, 163, 184, 0.4)",
                  }}
                >
                  MÀN HÌNH CHIẾU
                </div>

                {/* Seat legend */}
                <Space size="large" style={{ marginBottom: 20 }}>
                  <Space>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: "#e2e8f0",
                        border: "1px solid #cbd5e1",
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>Thường</Text>
                  </Space>
                  <Space>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: "#fef08a",
                        border: "1px solid #eab308",
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>VIP</Text>
                  </Space>
                  <Space>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: "#fbcfe8",
                        border: "1px solid #ec4899",
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>Đôi</Text>
                  </Space>
                  <Space>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: "#10b981",
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>Đang chọn</Text>
                  </Space>
                  <Space>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: "#94a3b8",
                      }}
                    />
                    <Text style={{ fontSize: 12 }}>Đã bán</Text>
                  </Space>
                </Space>

                {/* Seats Grid */}
                <div style={{ overflowX: "auto", maxWidth: "100%", padding: "10px 0" }}>
                  {Object.keys(seatRows).map((row) => (
                    <div
                      key={row}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          fontWeight: "bold",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {row}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {seatRows[row].map((seat) => {
                          const isOccupied = occupiedSeatIds.includes(seat._id);
                          const isSelected = selectedSeats.some((s) => s._id === seat._id);

                          let bgColor = "#e2e8f0";
                          let borderColor = "#cbd5e1";
                          let textColor = "#1e293b";

                          if (seat.type === "vip") {
                            bgColor = "#fef08a";
                            borderColor = "#eab308";
                          } else if (seat.type === "couple") {
                            bgColor = "#fbcfe8";
                            borderColor = "#ec4899";
                          }

                          if (isSelected) {
                            bgColor = "#10b981";
                            borderColor = "#059669";
                            textColor = "#ffffff";
                          }

                          if (isOccupied) {
                            bgColor = "#64748b";
                            borderColor = "#475569";
                            textColor = "#ffffff";
                          }

                          return (
                            <button
                              key={seat._id}
                              disabled={isOccupied}
                              onClick={() => handleToggleSeat(seat)}
                              style={{
                                width: seat.type === "couple" ? 64 : 34,
                                height: 34,
                                borderRadius: 6,
                                background: bgColor,
                                border: `1.5px solid ${borderColor}`,
                                color: textColor,
                                fontWeight: "bold",
                                fontSize: 11,
                                cursor: isOccupied ? "not-allowed" : "pointer",
                                opacity: isOccupied ? 0.6 : 1,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {seat.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Right Column: Combos, Customer & Checkout */}
        <Col xs={24} lg={9} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Step 3: Combos */}
          <Card
            title={
              <Space>
                <CoffeeOutlined style={{ color: "#d97706" }} />
                <span>3 🍿 Bỏng & Nước Uống</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 220, overflowY: "auto" }}>
              {combos.map((cb) => (
                <div
                  key={cb._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 8,
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      {cb.name}
                    </Text>
                    <br />
                    <Text type="success" style={{ fontSize: 12 }}>
                      {cb.price?.toLocaleString("vi-VN")} đ
                    </Text>
                  </div>

                  <InputNumber
                    min={0}
                    max={20}
                    value={selectedCombos[cb._id] || 0}
                    onChange={(val) =>
                      setSelectedCombos({ ...selectedCombos, [cb._id]: val || 0 })
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Step 4: Customer Info & Order Summary */}
          <Card title="4 💳 Thông Tin Đơn Hàng Quầy" style={{ borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Text strong>Tên Khách Hàng:</Text>
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Khách vãng lai"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <Text strong>Số Điện Thoại:</Text>
                <Input
                  placeholder="SĐT để lưu tích điểm (tùy chọn)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <Text strong>Hình Thức Thanh Toán:</Text>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: "100%", marginTop: 6 }}
                >
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Radio.Button value="cash" style={{ width: "100%", textAlign: "center" }}>
                        💵 Tiền Mặt
                      </Radio.Button>
                    </Col>
                    <Col span={12}>
                      <Radio.Button value="vnpay" style={{ width: "100%", textAlign: "center" }}>
                        📱 QR Chuyển Khoản
                      </Radio.Button>
                    </Col>
                  </Row>
                </Radio.Group>
              </div>

              <Divider style={{ margin: "12px 0" }} />

              {/* Price breakdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">Ghế chọn ({selectedSeats.length}):</Text>
                  <Text strong>{seatTotalPrice.toLocaleString("vi-VN")} đ</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text type="secondary">Bỏng nước:</Text>
                  <Text strong>{comboTotalPrice.toLocaleString("vi-VN")} đ</Text>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                    padding: "12px",
                    background: "#ecfdf5",
                    borderRadius: 8,
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <Text strong style={{ fontSize: 16, color: "#065f46" }}>
                    TỔNG THANH TOÁN:
                  </Text>
                  <Text strong style={{ fontSize: 20, color: "#10b981" }}>
                    {grandTotal.toLocaleString("vi-VN")} đ
                  </Text>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                block
                loading={submitting}
                disabled={selectedSeats.length === 0}
                icon={<CheckCircleOutlined />}
                style={{
                  height: 52,
                  background: "#10b981",
                  borderColor: "#10b981",
                  fontSize: 16,
                  fontWeight: "bold",
                  borderRadius: 10,
                  marginTop: 8,
                }}
                onClick={handleCreateCounterBooking}
              >
                XÁC NHẬN THANH TOÁN & IN VÉ
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Ticket Print Receipt Modal */}
      <Modal
        open={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPrintModalVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ background: "#10b981", borderColor: "#10b981" }}
            onClick={() => window.print()}
          >
            In Vé Giấy
          </Button>,
        ]}
        width={420}
        title={null}
      >
        <div
          id="printable-ticket"
          style={{
            padding: "20px 10px",
            textAlign: "center",
            background: "#ffffff",
            fontFamily: "monospace",
          }}
        >
          <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
            LUMORA CINEMA
          </Title>
          <Text style={{ fontSize: 12 }}>HÓA ĐƠN XÁC NHẬN VÉ XEM PHIM</Text>
          <Divider style={{ margin: "12px 0", borderColor: "#000" }} />

          <div style={{ textAlign: "left", fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
            <div>Mã đơn: <strong>{createdBooking?.bookingCode || "LUMORA-POS"}</strong></div>
            <div>Ngày tạo: {dayjs().format("DD/MM/YYYY HH:mm")}</div>
            <div>Khách hàng: {customerName} {customerPhone ? `(${customerPhone})` : ""}</div>
            <div>Thu ngân: {staffUser?.fullName}</div>
            <Divider style={{ margin: "8px 0", borderColor: "#ccc" }} />

            <div>Phim: <strong>{selectedShowtime?.movie?.title}</strong></div>
            <div>Phòng: <strong>{selectedShowtime?.room?.name}</strong></div>
            <div>Suất chiếu: <strong>{dayjs(selectedShowtime?.startTime).format("DD/MM/YYYY - HH:mm")}</strong></div>
            <div>
              Ghế: <strong>{selectedSeats.map((s) => s.code).join(", ")}</strong>
            </div>

            {Object.keys(selectedCombos).some((k) => selectedCombos[k] > 0) && (
              <div>
                Combo:{" "}
                <strong>
                  {Object.entries(selectedCombos)
                    .filter(([_, qty]) => qty > 0)
                    .map(([cId, qty]) => {
                      const cb = combos.find((c) => c._id === cId);
                      return `${cb?.name || "Combo"} x${qty}`;
                    })
                    .join(", ")}
                </strong>
              </div>
            )}

            <Divider style={{ margin: "8px 0", borderColor: "#ccc" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: "bold" }}>
              <span>TỔNG TIỀN:</span>
              <span>{grandTotal.toLocaleString("vi-VN")} đ</span>
            </div>
            <div>Hình thức: {paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản / QR"}</div>
          </div>

          {qrCodeDataUrl && (
            <div style={{ marginTop: 16 }}>
              <img src={qrCodeDataUrl} alt="QR Code Vé" style={{ width: 140, height: 140 }} />
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Quét mã QR tại cổng soát vé</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default StaffPos;
