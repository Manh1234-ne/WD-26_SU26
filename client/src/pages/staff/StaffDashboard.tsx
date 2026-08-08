import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Table,
  Tag,
  Typography,
  Space,
  Spin,
  Badge,
} from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  QrcodeOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "../../services/api";

const { Title, Text } = Typography;

interface TodayShowtime {
  _id: string;
  movie: { title: string; duration: number; poster: string };
  room: { name: string };
  startTime: string;
  endTime: string;
  price: number;
}

interface BookingRecord {
  _id: string;
  bookingCode: string;
  finalAmount: number;
  status: string;
  printStatus: string;
  createdAt: string;
  user?: { fullName: string; phone?: string };
  showtime?: {
    movie?: { title: string };
    room?: { name: string };
    startTime?: string;
  };
}

export function StaffDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showtimes, setShowtimes] = useState<TodayShowtime[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingRecord[]>([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayTicketsCount: 0,
    checkedInCount: 0,
    activeShowtimesCount: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings
      const bookingRes = await api.get("/bookings");
      const allBookings: BookingRecord[] = bookingRes.data?.data || bookingRes.data || [];

      const todayStr = dayjs().format("YYYY-MM-DD");

      const todayBookings = allBookings.filter((b) =>
        dayjs(b.createdAt).format("YYYY-MM-DD") === todayStr
      );

      const confirmedOrCompleted = todayBookings.filter(
        (b) => b.status === "confirmed" || b.status === "completed"
      );

      const rev = confirmedOrCompleted.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
      const checkedIn = allBookings.filter((b) => b.status === "completed").length;

      setStats({
        todayRevenue: rev,
        todayTicketsCount: confirmedOrCompleted.length,
        checkedInCount: checkedIn,
        activeShowtimesCount: 0,
      });

      setRecentBookings(allBookings.slice(0, 5));

      // Fetch showtimes
      const stRes = await api.get("/showtimes");
      const allSt: TodayShowtime[] = stRes.data?.data || stRes.data || [];
      const todaySt = allSt.filter((st) =>
        dayjs(st.startTime).format("YYYY-MM-DD") === todayStr
      );

      setShowtimes(todaySt);
      setStats((prev) => ({ ...prev, activeShowtimesCount: todaySt.length }));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang tổng quan staff:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "bookingCode",
      key: "bookingCode",
      render: (code: string) => (
        <Text strong style={{ color: "#2563eb" }}>
          {code}
        </Text>
      ),
    },
    {
      title: "Khách Hàng",
      key: "user",
      render: (_: any, record: BookingRecord) => (
        <span>{record.user?.fullName || "Khách vãng lai"}</span>
      ),
    },
    {
      title: "Phim",
      key: "movie",
      render: (_: any, record: BookingRecord) => (
        <span>{record.showtime?.movie?.title || "Phim rạp"}</span>
      ),
    },
    {
      title: "Tổng Tiền",
      dataIndex: "finalAmount",
      key: "finalAmount",
      render: (amount: number) => (
        <Text type="success" strong>
          {amount?.toLocaleString("vi-VN")} đ
        </Text>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "blue";
        let text = status;
        if (status === "completed") {
          color = "green";
          text = "Đã soát vé";
        } else if (status === "confirmed") {
          color = "gold";
          text = "Đã thanh toán";
        } else if (status === "cancelled") {
          color = "red";
          text = "Đã hủy";
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải thông tin ca trực..." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "24px 32px",
          borderRadius: 16,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div>
          <Title level={3} style={{ color: "white", margin: 0 }}>
            Chào mừng Ca Trực Nhân Viên 🎬
          </Title>
          <Text style={{ color: "#94a3b8" }}>
            Hệ thống Quản lý Bán vé tại quầy & Soát vé Lumora Cinema - Ngày{" "}
            {dayjs().format("DD/MM/YYYY")}
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<ShoppingOutlined />}
          style={{
            background: "#b91c1c",
            borderColor: "#b91c1c",
            height: 48,
            padding: "0 24px",
            fontWeight: 600,
            borderRadius: 10,
          }}
          onClick={() => navigate("/staff/pos")}
        >
          Mở Máy Bán Vé Quầy (POS)
        </Button>
      </div>

      {/* Metrics Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Doanh Thu Ca Hôm Nay"
              value={stats.todayRevenue}
              suffix="đ"
              groupSeparator="."
              valueStyle={{ color: "#10b981", fontWeight: "bold" }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Số Vé Bán Ca Trực"
              value={stats.todayTicketsCount}
              suffix="đơn"
              valueStyle={{ color: "#2563eb", fontWeight: "bold" }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Lượt Soát Vé Thành Công"
              value={stats.checkedInCount}
              suffix="lượt"
              valueStyle={{ color: "#8b5cf6", fontWeight: "bold" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Suất Chiếu Hôm Nay"
              value={stats.activeShowtimesCount}
              suffix="suất"
              valueStyle={{ color: "#f59e0b", fontWeight: "bold" }}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Action Navigation Buttons */}
      <Card title="Thao Tác Nhanh" style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              hoverable
              style={{
                background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                borderColor: "#a7f3d0",
              }}
              onClick={() => navigate("/staff/pos")}
            >
              <Space size="middle" align="center">
                <div
                  style={{
                    background: "#10b981",
                    color: "white",
                    padding: 14,
                    borderRadius: 12,
                    fontSize: 24,
                  }}
                >
                  <ShoppingOutlined />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: "#065f46" }}>
                    Bán Vé Tại Quầy (POS)
                  </Title>
                  <Text style={{ fontSize: 12, color: "#b91c1c" }}>
                    Chọn phim, sơ đồ ghế, combo & xuất vé cho khách
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              hoverable
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                borderColor: "#bfdbfe",
              }}
              onClick={() => navigate("/staff/checkin")}
            >
              <Space size="middle" align="center">
                <div
                  style={{
                    background: "#2563eb",
                    color: "white",
                    padding: 14,
                    borderRadius: 12,
                    fontSize: 24,
                  }}
                >
                  <QrcodeOutlined />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: "#1e40af" }}>
                    Soát Vé & Quét Mã QR
                  </Title>
                  <Text style={{ fontSize: 12, color: "#1d4ed8" }}>
                    Quét QR code vé hoặc nhập mã kiểm tra vào phòng
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              hoverable
              style={{
                background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                borderColor: "#ddd6fe",
              }}
              onClick={() => navigate("/staff/bookings")}
            >
              <Space size="middle" align="center">
                <div
                  style={{
                    background: "#7c3aed",
                    color: "white",
                    padding: 14,
                    borderRadius: 12,
                    fontSize: 24,
                  }}
                >
                  <UnorderedListOutlined />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: "#5b21b6" }}>
                    Tra Cứu Vé & Đơn Hàng
                  </Title>
                  <Text style={{ fontSize: 12, color: "#6d28d9" }}>
                    Tra cứu theo mã vé, SĐT, in lại vé & kiểm tra trạng thái
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Main Content Split: Showtimes & Recent Bookings */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: "#f59e0b" }} />
                <span>Lịch Chiếu Hôm Nay ({showtimes.length})</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate("/staff/pos")}>
                Bán vé <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 12 }}
          >
            {showtimes.length === 0 ? (
              <Text type="secondary">Chưa có suất chiếu nào được tạo cho hôm nay.</Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {showtimes.slice(0, 6).map((st) => (
                  <div
                    key={st._id}
                    style={{
                      padding: 12,
                      background: "#f8fafc",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        {st.movie?.title}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Phòng: <strong>{st.room?.name}</strong> • Giờ chiếu:{" "}
                        <Tag color="blue">{dayjs(st.startTime).format("HH:mm")}</Tag>
                      </Text>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      ghost
                      onClick={() => navigate(`/staff/pos?showtimeId=${st._id}`)}
                    >
                      Bán vé
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <Badge dot status="processing" />
                <span>Vé Vừa Đặt / Giao Dịch Gần Đây</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate("/staff/bookings")}>
                Xem tất cả <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 12 }}
          >
            <Table
              dataSource={recentBookings}
              columns={columns}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default StaffDashboard;
