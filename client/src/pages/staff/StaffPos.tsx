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
  Radio,
  Divider,
  Result,
  DatePicker,
} from "antd";
import { ClapperboardIcon, PopcornIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ShoppingOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  UserOutlined,
  DollarOutlined,
  CoffeeOutlined,
  SearchOutlined,
  PercentageOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import QRCode from "qrcode";
import { useAuthStore } from "../../features/auth/auth.store";
import Swal from "sweetalert2";

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
  basePrice: number;
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
  const { user: staffUser } = useAuthStore();
  const queryShowtimeId = searchParams.get("showtimeId");

  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<string>("");
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>("");
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

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
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  // Voucher state
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Cash payment calculator state
  const [cashGiven, setCashGiven] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [submitting, setSubmitting] = useState(false);

  // POS Mode: 'ticket' = bán vé + bắp nước, 'combo' = chỉ bán bắp nước
  const [posMode, setPosMode] = useState<"ticket" | "combo">("ticket");

  // Combo-only order result
  const [createdComboOrder, setCreatedComboOrder] = useState<any>(null);

  // Receipt Modal State
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Fetch showtimes by selected date
  const fetchShowtimesByDate = async (date: dayjs.Dayjs) => {
    try {
      const dateStr = date.format("YYYY-MM-DD");
      const showtimesRes = await api.get(`/showtimes?date=${dateStr}&includePast=true`);
      const sList: Showtime[] = showtimesRes.data?.data || showtimesRes.data || [];
      setShowtimes(sList);
      setSelectedShowtimeId("");
      setSelectedMovieId("");
    } catch (err) {
      toast.error("Lỗi khi tải danh sách suất chiếu");
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const today = dayjs();
        const dateStr = today.format("YYYY-MM-DD");
        const [moviesRes, showtimesRes, combosRes] = await Promise.all([
          api.get("/movies"),
          api.get(`/showtimes?date=${dateStr}&includePast=true`),
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

    const roomId = (st?.room as any)?._id || st?.room?._id;

    if (roomId) {
      setLoading(true);
      setSeats([]);
      setOccupiedSeatIds([]);

      api.get(`/seats/room/${roomId}`)
        .then((seatsRes) => {
          const raw = seatsRes.data?.data ?? seatsRes.data;
          const seatArr: Seat[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.seats)
              ? raw.seats
              : [];
          setSeats(seatArr);
        })
        .catch((err) => {
          console.error("[POS] Lỗi tải ghế:", err);
          toast.error("Không thể tải sơ đồ ghế");
        })
        .finally(() => setLoading(false));

      api.get(`/booking-seats/showtime/${selectedShowtimeId}/occupied`)
        .then((occRes) => {
          const rawOcc = occRes.data?.data ?? occRes.data;
          const occArr: any[] = Array.isArray(rawOcc) ? rawOcc : [];
          setOccupiedSeatIds(
            occArr.map((item: any) => item.seat?._id || item.seat || item)
          );
        })
        .catch((err) => {
          console.error("[POS] Không tải được ghế đã bán:", err);
        });
    } else {
      toast.warning("Suất chiếu này chưa được gán phòng chiếu!");
    }
  }, [selectedShowtimeId, showtimes]);

  // Handle seat click
  const handleToggleSeat = (seat: Seat) => {
    if (occupiedSeatIds.includes(seat._id)) {
      toast.warning(`Ghế ${seat.code} đã được đặt trước!`);
      return;
    }

    const isAlreadySelected = selectedSeats.some((s) => s._id === seat._id);
    const newSelected = isAlreadySelected
      ? selectedSeats.filter((s) => s._id !== seat._id)
      : [...selectedSeats, seat];

    if (!isAlreadySelected && selectedSeats.length >= 8) {
      Swal.fire({
        title: "Quá số lượng ghế!",
        text: "Chỉ được chọn tối đa 8 ghế trong 1 giao dịch quầy",
        icon: "warning",
        confirmButtonColor: "#1890ff",
      });
      return;
    }

    if (checkAllRowsForIsolation(newSelected)) {
      Swal.fire({
        title: "Thông báo",
        text: "Việc chọn vị trí ghế của bạn không được để trống 1 ghế ở bên trái, giữa hoặc bên phải trên cùng hàng ghế mà bạn vừa chọn.",
        icon: "warning",
        confirmButtonColor: "#e11d48",
      });
      return;
    }

    setSelectedSeats(newSelected);
  };

  // Group seats by row
  const seatRows = useMemo(() => {
    const map: { [row: string]: Seat[] } = {};
    seats.forEach((seat) => {
      if (!map[seat.row]) map[seat.row] = [];
      map[seat.row].push(seat);
    });
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => a.number - b.number);
    });
    return map;
  }, [seats]);

  const hasIsolatedSeat = (rowSeats: Seat[], occupied: Set<string>, selected: Set<string>) => {
    const states = rowSeats.map((s) => {
      if (occupied.has(s._id)) return 'used';
      if (selected.has(s._id)) return 'used';
      return 'empty';
    });
    for (let i = 1; i < states.length - 1; i++) {
      if (
        states[i] === 'empty' &&
        states[i - 1] === 'used' &&
        states[i + 1] === 'used'
      ) {
        return true;
      }
    }
    return false;
  };

  const checkAllRowsForIsolation = (selected: Seat[]) => {
    const selectedSet = new Set<string>(selected.map((s) => s._id));
    return Object.values(seatRows).some((rowSeats) =>
      hasIsolatedSeat(rowSeats, new Set(occupiedSeatIds), selectedSet)
    );
  };

  // Price calculations
  const seatTotalPrice = useMemo(() => {
    if (!selectedShowtime) return 0;
    const basePrice = selectedShowtime.basePrice || 0;
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

  // Customer search by phone
  const handleSearchCustomerByPhone = async () => {
    if (!customerPhone || !customerPhone.trim()) {
      toast.warning("Vui lòng nhập số điện thoại để tra cứu thành viên");
      return;
    }
    setSearchingUser(true);
    try {
      const res = await api.get(`/users/by-phone/${customerPhone.trim()}`);
      const userData = res.data?.data || res.data;
      if (userData && userData._id) {
        setFoundUser(userData);
        setCustomerName(userData.fullName || "Khách thành viên");
        toast.success(`Đã tìm thấy thành viên: ${userData.fullName}`);
      } else {
        setFoundUser(null);
        toast.info("Không tìm thấy thành viên với SĐT này (Đơn lưu dạng Khách vãng lai)");
      }
    } catch {
      setFoundUser(null);
      toast.info("Không tìm thấy thông tin thành viên (Đơn lưu dạng Khách vãng lai)");
    } finally {
      setSearchingUser(false);
    }
  };

  // Voucher validation
  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) {
      toast.warning("Vui lòng nhập mã voucher");
      return;
    }
    setVoucherLoading(true);
    try {
      const res = await api.get("/vouchers");
      const list: any[] = res.data?.data || res.data || [];
      const codeUpper = voucherCodeInput.trim().toUpperCase();
      const v = list.find((item) => item.code?.toUpperCase() === codeUpper && item.isActive);

      if (!v) {
        toast.error("Mã voucher không tồn tại hoặc đã bị khóa/hết hạn!");
        setAppliedVoucher(null);
        return;
      }

      const now = new Date();
      if (new Date(v.startDate) > now || new Date(v.endDate) < now) {
        toast.error("Voucher không nằm trong thời gian sử dụng!");
        setAppliedVoucher(null);
        return;
      }

      const subtotal = seatTotalPrice + comboTotalPrice;
      if (v.minOrderAmount && subtotal < v.minOrderAmount) {
        toast.error(`Đơn hàng tối thiểu ${v.minOrderAmount.toLocaleString("vi-VN")} đ để áp dụng voucher này!`);
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher(v);
      toast.success(`Đã áp dụng mã giảm giá ${v.code}!`);
    } catch {
      toast.error("Lỗi khi kiểm tra voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput("");
    toast.info("Đã hủy áp dụng voucher");
  };

  // Discount & Totals calculation
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const subtotal = seatTotalPrice + comboTotalPrice;
    if (appliedVoucher.minOrderAmount && subtotal < appliedVoucher.minOrderAmount) return 0;

    let discount = 0;
    if (appliedVoucher.discountType === "percent") {
      discount = (subtotal * appliedVoucher.discountValue) / 100;
      if (appliedVoucher.maxDiscountAmount && discount > appliedVoucher.maxDiscountAmount) {
        discount = appliedVoucher.maxDiscountAmount;
      }
    } else if (appliedVoucher.discountType === "fixed") {
      discount = appliedVoucher.discountValue;
    }

    return Math.min(discount, subtotal);
  }, [appliedVoucher, seatTotalPrice, comboTotalPrice]);

  const grandTotal = Math.max(0, seatTotalPrice + comboTotalPrice - discountAmount);

  const cashChange = useMemo(() => {
    if (cashGiven === null || cashGiven === undefined) return 0;
    return cashGiven - grandTotal;
  }, [cashGiven, grandTotal]);

  // Handle Combo-Only Order
  const handleCreateComboOnlyOrder = async () => {
    const hasItems = Object.values(selectedCombos).some((qty) => qty > 0);
    if (!hasItems) {
      toast.error("Vui lòng chọn ít nhất 1 combo/bắp nước!");
      return;
    }
    if (paymentMethod === "cash" && (cashGiven === null || cashGiven < grandTotal)) {
      toast.error("Số tiền khách đưa chưa đủ để hoàn tất thanh toán!");
      return;
    }

    setSubmitting(true);
    try {
      const items = Object.entries(selectedCombos)
        .filter(([_, qty]) => qty > 0)
        .map(([combo, quantity]) => ({ combo, quantity }));

      const payload = {
        items,
        customerName: customerName || "Khách vãng lai",
        customerPhone: customerPhone || "",
        paymentMethod,
      };

      const res = await api.post("/combo-orders", payload);
      const orderData = res.data?.data || res.data;

      const orderCode = orderData?.orderCode || "CO-POS";
      const qrData = await QRCode.toDataURL(orderCode);

      setQrCodeDataUrl(qrData);
      setCreatedComboOrder(orderData);
      setPrintModalVisible(true);
      toast.success("Tạo đơn bắp nước thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi tạo đơn bắp nước");
    } finally {
      setSubmitting(false);
    }
  };

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
    if (paymentMethod === "cash" && (cashGiven === null || cashGiven < grandTotal)) {
      toast.error("Số tiền khách đưa chưa đủ để hoàn tất thanh toán!");
      return;
    }

    setSubmitting(true);
    try {
      const comboItems = Object.entries(selectedCombos)
        .filter(([_, qty]) => qty > 0)
        .map(([cId, qty]) => ({ combo: cId, quantity: qty }));

      const payload = {
        showtime: selectedShowtimeId,
        seatIds: selectedSeats.map((s) => s._id),
        combos: comboItems,
        customerName: customerName || "Khách vãng lai",
        customerPhone: customerPhone || "",
        paymentMethod: paymentMethod,
        isCounterSale: true,
        voucherCode: appliedVoucher?.code || undefined,
        user: foundUser?._id || undefined,
      };

      const res = await api.post("/bookings", payload);
      const bookingData = res.data?.data || res.data;

      const bookingCode = bookingData?.bookingCode || bookingData?._id || "LUMORA-POS";
      const qrData = await QRCode.toDataURL(bookingCode);

      setQrCodeDataUrl(qrData);
      setCreatedBooking(bookingData);
      setPrintModalVisible(true);
      toast.success("Tạo đơn vé quầy thành công!");

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
    setFoundUser(null);
    setVoucherCodeInput("");
    setAppliedVoucher(null);
    setCashGiven(null);
    setPrintModalVisible(false);
    setCreatedBooking(null);
    setCreatedComboOrder(null);
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
          <ShoppingOutlined style={{ fontSize: 24, color: "#b91c1c" }} />
          <div>
            <Title level={4} style={{ color: "white", margin: 0 }}>
              Hệ Thống Bán Vé Quầy (Staff POS)
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Nhân viên lập vé trực tiếp • Ca làm việc: {staffUser?.fullName || "Staff"}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              background: "#1e293b",
              borderRadius: 8,
              padding: 4,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => { setPosMode("ticket"); resetPosState(); }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: posMode === "ticket" ? "#b91c1c" : "transparent",
                color: posMode === "ticket" ? "white" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <HugeiconsIcon icon={ClapperboardIcon} style={{ fontSize: 16 }} /> Bán Vé
            </button>
            <button
              type="button"
              onClick={() => { setPosMode("combo"); resetPosState(); }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: posMode === "combo" ? "#d97706" : "transparent",
                color: posMode === "combo" ? "white" : "#94a3b8",
                transition: "all 0.2s",
              }}
            >
              <HugeiconsIcon icon={PopcornIcon} style={{ fontSize: 16 }} /> Chỉ Bán Bắp Nước
            </button>
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
      </div>

      <Row gutter={[20, 20]}>
        {/* Left Column: Movie, Showtime & Seat Selection */}
        <Col xs={24} lg={posMode === "combo" ? 0 : 15} style={{ display: posMode === "combo" ? "none" : "flex", flexDirection: "column", gap: 20 }}>
          <Card title="1.Chọn Phim & Suất Chiếu" style={{ borderRadius: 12 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <Text strong>Ngày Chiếu:</Text>
                  <DatePicker
                    value={selectedDate}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    onChange={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        fetchShowtimesByDate(date);
                      }
                    }}
                    style={{ flex: 1, maxWidth: 200 }}
                  />
                  <Tag color={selectedDate.isSame(dayjs(), "day") ? "red" : "orange"}>
                    {selectedDate.isSame(dayjs(), "day") ? "Hôm nay" : selectedDate.format("dddd, DD/MM")}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {showtimes.length} suất chiếu trong ngày
                  </Text>
                </div>
              </Col>

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
                <Text strong>Suất Chiếu Trong Ngày ({selectedDate.format("DD/MM")}):</Text>
                <Select
                  placeholder={selectedMovieId ? "-- Chọn Suất Chiếu --" : "Chọn phim trước"}
                  style={{ width: "100%", marginTop: 6 }}
                  value={selectedShowtimeId || undefined}
                  onChange={(sId) => setSelectedShowtimeId(sId)}
                  disabled={!selectedMovieId}
                  notFoundContent={
                    selectedMovieId
                      ? <span style={{ fontSize: 12, color: "#94a3b8" }}>Không có suất chiếu hôm nay cho phim này</span>
                      : null
                  }
                >
                  {filteredShowtimes.map((st) => (
                    <Option key={st._id} value={st._id}>
                      [{dayjs(st.startTime).format("HH:mm")} - {dayjs(st.endTime).format("HH:mm")}] Phòng {st.room?.name} —{" "}
                      {st.basePrice?.toLocaleString("vi-VN")}đ
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
                <span>2.Sơ Đồ Chọn Ghế ({selectedSeats.length} ghế đã chọn)</span>
                {selectedShowtime && (
                  <Tag color="purple">
                    Phòng: {selectedShowtime.room?.name} | Giá gốc:{" "}
                    {selectedShowtime.basePrice?.toLocaleString("vi-VN")}đ
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
            ) : seats.length === 0 ? (
              <Result
                status="warning"
                title="Không tìm thấy ghế trong phòng chiếu này"
                subTitle="Phòng chiếu chưa được cấu hình ghế hoặc có lỗi kết nối. Vui lòng kiểm tra lại."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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

                <Space size="large" style={{ marginBottom: 20 }}>
                  <Space>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#e2e8f0", border: "1px solid #cbd5e1" }} />
                    <Text style={{ fontSize: 12 }}>Thường</Text>
                  </Space>
                  <Space>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fef08a", border: "1px solid #eab308" }} />
                    <Text style={{ fontSize: 12 }}>VIP</Text>
                  </Space>
                  <Space>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fbcfe8", border: "1px solid #ec4899" }} />
                    <Text style={{ fontSize: 12 }}>Đôi</Text>
                  </Space>
                  <Space>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#10b981" }} />
                    <Text style={{ fontSize: 12 }}>Đang chọn</Text>
                  </Space>
                  <Space>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#64748b" }} />
                    <Text style={{ fontSize: 12 }}>Đã bán</Text>
                  </Space>
                </Space>

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
                      <span style={{ width: 24, fontWeight: "bold", textAlign: "center", color: "#64748b" }}>
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
        <Col xs={24} lg={posMode === "combo" ? 24 : 9} style={{ display: "flex", flexDirection: posMode === "combo" ? "row" : "column", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Step 3: Combos */}
          <Card
            title={
              <Space>
                <CoffeeOutlined style={{ color: "#d97706" }} />
                <span>{posMode === "combo" ? "Chọn Bắp Nước" : "3.Bỏng & Nước Uống"}</span>
              </Space>
            }
            style={{ borderRadius: 12, flex: posMode === "combo" ? 1 : undefined, minWidth: posMode === "combo" ? 320 : undefined }}
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
                    <Text type="danger" style={{ fontSize: 12 }}>
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
          <Card title={
            <Space>
              <DollarOutlined style={{ color: "#d97706" }} />
              <span>4.Thông Tin Đơn Hàng Quầy</span>
            </Space>
          } style={{ borderRadius: 12, flex: posMode === "combo" ? 1 : undefined, minWidth: posMode === "combo" ? 340 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Customer Phone & Member Search */}
              <div>
                <Text strong>Số Điện Thoại Khách Hàng:</Text>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Input
                    placeholder="SĐT thành viên / khách vãng lai..."
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (foundUser) setFoundUser(null);
                    }}
                    onPressEnter={handleSearchCustomerByPhone}
                  />
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    loading={searchingUser}
                    onClick={handleSearchCustomerByPhone}
                  >
                    Tra cứu
                  </Button>
                </div>
                {foundUser && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6 }}>
                    <Tag color="success" icon={<CheckCircleOutlined />}>Thành viên hệ thống</Tag>
                    <Text strong style={{ fontSize: 13, color: "#166534" }}>{foundUser.fullName}</Text>
                    {foundUser.email && <Text type="secondary" style={{ fontSize: 12, display: "block" }}>{foundUser.email}</Text>}
                  </div>
                )}
              </div>

              {/* Customer Name */}
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

              {/* Voucher Code Input */}
              <div>
                <Text strong>Mã Giảm Giá / Voucher Quầy:</Text>
                {appliedVoucher ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6 }}>
                    <div>
                      <Tag color="blue" icon={<PercentageOutlined />}>{appliedVoucher.code}</Tag>
                      <Text style={{ fontSize: 12, color: "#1e40af" }}>
                        {appliedVoucher.discountType === "percent"
                          ? `Giảm ${appliedVoucher.discountValue}%`
                          : `Giảm ${appliedVoucher.discountValue?.toLocaleString("vi-VN")} đ`}
                      </Text>
                    </div>
                    <Button size="small" type="text" danger icon={<CloseCircleOutlined />} onClick={handleRemoveVoucher}>
                      Gỡ
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Input
                      prefix={<PercentageOutlined />}
                      placeholder="Nhập mã voucher..."
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                      onPressEnter={handleApplyVoucher}
                    />
                    <Button
                      loading={voucherLoading}
                      onClick={handleApplyVoucher}
                    >
                      Áp dụng
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Text strong>Hình Thức Thanh Toán:</Text>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== "cash") setCashGiven(null);
                  }}
                  style={{ width: "100%", marginTop: 6 }}
                >
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Radio.Button value="cash" style={{ width: "100%", textAlign: "center" }}>
                        Tiền Mặt
                      </Radio.Button>
                    </Col>
                    <Col span={12}>
                      <Radio.Button value="vnpay" style={{ width: "100%", textAlign: "center" }}>
                        QR Chuyển Khoản
                      </Radio.Button>
                    </Col>
                  </Row>
                </Radio.Group>
              </div>

              {/* Cash Given & Change Calculator */}
              {paymentMethod === "cash" && (
                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>Máy Tính Tiền Mặt Khách Đưa:</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Số tiền nhận từ khách:</Text>
                    <InputNumber
                      style={{ width: "100%", marginTop: 2 }}
                      min={0}
                      step={10000}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, "") || 0)}
                      placeholder="Nhập số tiền mặt..."
                      value={cashGiven}
                      onChange={(val) => setCashGiven(val)}
                    />
                  </div>

                  {/* Quick cash buttons */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Button size="small" onClick={() => setCashGiven(grandTotal)}>
                      Đủ tiền ({grandTotal.toLocaleString("vi-VN")} đ)
                    </Button>
                    <Button size="small" onClick={() => setCashGiven((prev) => (prev || 0) + 50000)}>
                      +50k
                    </Button>
                    <Button size="small" onClick={() => setCashGiven((prev) => (prev || 0) + 100000)}>
                      +100k
                    </Button>
                    <Button size="small" onClick={() => setCashGiven((prev) => (prev || 0) + 200000)}>
                      +200k
                    </Button>
                    <Button size="small" onClick={() => setCashGiven((prev) => (prev || 0) + 500000)}>
                      +500k
                    </Button>
                  </div>

                  {/* Cash Change result */}
                  {cashGiven !== null && (
                    <div style={{ marginTop: 4 }}>
                      {cashGiven < grandTotal ? (
                        <Text type="danger" strong style={{ fontSize: 12 }}>
                          ⚠️ Tiền khách đưa chưa đủ! (Còn thiếu {(grandTotal - (cashGiven || 0)).toLocaleString("vi-VN")} đ)
                        </Text>
                      ) : (
                        <div style={{ padding: "6px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Text strong style={{ color: "#15803d" }}>TIỀN THỪA TRẢ KHÁCH:</Text>
                          <Text strong style={{ fontSize: 16, color: "#16a34a" }}>
                            {cashChange.toLocaleString("vi-VN")} đ
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Divider style={{ margin: "8px 0" }} />

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

                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Text type="secondary">Voucher giảm giá:</Text>
                    <Text type="danger" strong>-{discountAmount.toLocaleString("vi-VN")} đ</Text>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 6,
                    padding: "12px",
                    background: "#fff2f2ff",
                    borderRadius: 8,
                    border: "1px solid #f50505ff",
                  }}
                >
                  <Text strong style={{ fontSize: 16, color: "#9e0b0bff" }}>
                    TỔNG THANH TOÁN:
                  </Text>
                  <Text strong style={{ fontSize: 20, color: "#b91c1c" }}>
                    {grandTotal.toLocaleString("vi-VN")} đ
                  </Text>
                </div>
              </div>

              {/* Confirmation Buttons */}
              {(() => {
                const hasSeats = selectedSeats.length > 0;
                const hasCombos = Object.values(selectedCombos).some((q) => q > 0);
                const isCashInsufficient = paymentMethod === "cash" && (cashGiven !== null && cashGiven < grandTotal);

                if (posMode === "combo" || (!hasSeats && hasCombos)) {
                  return (
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={submitting}
                      disabled={!hasCombos || isCashInsufficient}
                      icon={<CheckCircleOutlined />}
                      style={{
                        height: 52,
                        background: "#ff0000ff",
                        borderColor: "#a44242ff",
                        fontSize: 16,
                        fontWeight: "bold",
                        borderRadius: 10,
                        marginTop: 8,
                        color: "white",
                      }}
                      onClick={handleCreateComboOnlyOrder}
                    >
                      XÁC NHẬN BÁN BẮP NƯỚC
                    </Button>
                  );
                }

                return (
                  <Button
                    type="primary"
                    size="large"
                    block
                    loading={submitting}
                    disabled={!hasSeats || isCashInsufficient}
                    icon={<CheckCircleOutlined />}
                    style={{
                      height: 52,
                      background: "#ff0000ff",
                      borderColor: "#a44242ff",
                      fontSize: 16,
                      fontWeight: "bold",
                      borderRadius: 10,
                      marginTop: 8,
                      color: "white",
                    }}
                    onClick={handleCreateCounterBooking}
                  >
                    XÁC NHẬN THANH TOÁN & IN VÉ
                  </Button>
                );
              })()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Ticket Print Receipt Modal (80mm Thermal Receipt Format) */}
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
            In Hóa Đơn Vé (80mm)
          </Button>,
        ]}
        width={440}
        title={null}
      >
        <div
          id="printable-ticket"
          style={{
            padding: "16px 12px",
            textAlign: "center",
            background: "#ffffff",
            fontFamily: "monospace, 'Courier New', sans-serif",
            color: "#000000",
          }}
        >
          <Title level={3} style={{ margin: 0, color: "#0f172a", letterSpacing: 1 }}>
            LUMORA CINEMA
          </Title>
          <Text style={{ fontSize: 12, fontWeight: "bold" }}>
            {createdComboOrder ? "HÓA ĐƠN BẮP NƯỚC QUẦY" : "HÓA ĐƠN XÁC NHẬN VÉ XEM PHIM"}
          </Text>
          <Divider style={{ margin: "10px 0", borderColor: "#000", borderStyle: "dashed" }} />

          <div style={{ textAlign: "left", fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
            <div>Mã đơn: <strong>{createdComboOrder?.orderCode || createdBooking?.bookingCode || "LUMORA-POS"}</strong></div>
            <div>Thời gian: {dayjs().format("DD/MM/YYYY HH:mm")}</div>
            <div>Khách hàng: <strong>{customerName}</strong> {customerPhone ? `(${customerPhone})` : ""}</div>
            <div>Thu ngân lập vé: {staffUser?.fullName || "Nhân viên quầy"}</div>
            <Divider style={{ margin: "6px 0", borderColor: "#aaa", borderStyle: "dashed" }} />

            {!createdComboOrder && (
              <>
                <div>Phim: <strong>{selectedShowtime?.movie?.title}</strong></div>
                <div>Phòng chiếu: <strong>{selectedShowtime?.room?.name}</strong></div>
                <div>Suất chiếu: <strong>{dayjs(selectedShowtime?.startTime).format("DD/MM/YYYY - HH:mm")}</strong></div>
                <div>
                  Vị trí ghế: <strong>{selectedSeats.map((s) => s.code).join(", ")}</strong> ({selectedSeats.length} ghế)
                </div>
                <Divider style={{ margin: "6px 0", borderColor: "#aaa", borderStyle: "dashed" }} />
              </>
            )}

            {createdComboOrder ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Bắp nước đã mua:</div>
                {createdComboOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{item.combo?.name || "Combo"} x{item.quantity}</span>
                    <span>{(item.totalPrice || 0).toLocaleString("vi-VN")} đ</span>
                  </div>
                ))}
              </div>
            ) : Object.keys(selectedCombos).some((k) => selectedCombos[k] > 0) && (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Bắp nước kèm theo:</div>
                {Object.entries(selectedCombos)
                  .filter(([_, qty]) => qty > 0)
                  .map(([cId, qty]) => {
                    const cb = combos.find((c) => c._id === cId);
                    return (
                      <div key={cId} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{cb?.name || "Combo"} x{qty}</span>
                        <span>{((cb?.price || 0) * qty).toLocaleString("vi-VN")} đ</span>
                      </div>
                    );
                  })}
                <Divider style={{ margin: "6px 0", borderColor: "#aaa", borderStyle: "dashed" }} />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tổng tiền ghế:</span>
              <span>{seatTotalPrice.toLocaleString("vi-VN")} đ</span>
            </div>
            {comboTotalPrice > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tổng bắp nước:</span>
                <span>{comboTotalPrice.toLocaleString("vi-VN")} đ</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Voucher giảm giá ({appliedVoucher?.code}):</span>
                <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
              </div>
            )}
            <Divider style={{ margin: "6px 0", borderColor: "#000", borderStyle: "solid" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" }}>
              <span>TỔNG TIỀN THANH TOÁN:</span>
              <span>{(createdComboOrder?.totalAmount ?? grandTotal).toLocaleString("vi-VN")} đ</span>
            </div>

            <div style={{ marginTop: 4 }}>Hình thức: {paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản / QR"}</div>

            {paymentMethod === "cash" && cashGiven !== null && cashGiven !== undefined && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tiền khách đưa:</span>
                  <span>{cashGiven.toLocaleString("vi-VN")} đ</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>Tiền thừa trả lại:</span>
                  <span>{Math.max(0, cashGiven - grandTotal).toLocaleString("vi-VN")} đ</span>
                </div>
              </>
            )}
          </div>

          {qrCodeDataUrl && (
            <div style={{ marginTop: 14 }}>
              <img src={qrCodeDataUrl} alt="QR Code Vé" style={{ width: 130, height: 130 }} />
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Quét mã QR tại cổng kiểm soát để vào phòng chiếu</div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 10, fontStyle: "italic", color: "#64748b" }}>
            Cảm ơn quý khách đã chọn Lumora Cinema!
          </div>
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-ticket, #printable-ticket * {
              visibility: visible !important;
            }
            #printable-ticket {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              padding: 4mm !important;
              background: #fff !important;
              color: #000 !important;
            }
            .ant-modal-footer, .ant-modal-close {
              display: none !important;
            }
          }
        `}</style>
      </Modal>
    </div>
  );
}

export default StaffPos;
