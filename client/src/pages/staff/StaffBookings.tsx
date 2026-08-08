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
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import QRCode from "qrcode";

const { Title, Text } = Typography;
const { Option } = Select;

export function StaffBookings() {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Booking Drawer
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bookings");
      const list = res.data?.data || res.data || [];
      setBookings(list);
    } catch (err) {
      toast.error("Lỗi khi tải danh sách vé/đơn hàng");
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
        item.user?.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.user?.phone?.includes(searchText) ||
        item.showtime?.movie?.title?.toLowerCase().includes(searchText.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [bookings, searchText, statusFilter]);

  const handleOpenDetail = async (record: any) => {
    try {
      const res = await api.get(`/bookings/${record._id}`);
      const detail = res.data?.data || res.data || record;
      setSelectedBooking(detail);

      const qr = await QRCode.toDataURL(record.bookingCode || record._id);
      setQrCodeUrl(qr);
      setDrawerVisible(true);
    } catch {
      setSelectedBooking(record);
      setDrawerVisible(true);
    }
  };

  const handleCheckInFromList = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/complete`);
      toast.success("Soát vé thành công!");
      fetchBookings();
      if (selectedBooking?._id === id) {
        setSelectedBooking((prev: any) => ({ ...prev, status: "completed" }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể soát vé");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintTicket = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/bookings/${id}/print`);
      toast.success("Đã đánh dấu in vé!");
      fetchBookings();
      window.print();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể thực hiện in vé");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: "Mã Đơn / Barcode",
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
      key: "customer",
      render: (_: any, record: any) => (
        <div>
          <div>{record.user?.fullName || "Khách tại quầy"}</div>
          {record.user?.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.user.phone}
            </Text>
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
        } else if (status === "pending") {
          color = "orange";
          text = "Chờ thanh toán";
        }
        return <Tag color={color}>{text}</Tag>;
      },
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
              onClick={() => handleCheckInFromList(record._id)}
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
              onClick={() => handlePrintTicket(record._id)}
            >
              In vé
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

      {/* Detail Drawer */}
      <Drawer
        title={`Chi Tiết Đơn Vé #${selectedBooking?.bookingCode || ""}`}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={480}
      >
        {selectedBooking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {qrCodeUrl && (
              <div style={{ textAlign: "center" }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: 140, height: 140 }} />
                <div>
                  <Text type="secondary">Mã quét cửa: {selectedBooking.bookingCode}</Text>
                </div>
              </div>
            )}

            <Descriptions title="Thông tin vé" column={1} bordered size="small">
              <Descriptions.Item label="Mã Booking">
                <Text strong>{selectedBooking.bookingCode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {selectedBooking.user?.fullName || "Khách vãng lai"} (
                {selectedBooking.user?.phone || "N/A"})
              </Descriptions.Item>
              <Descriptions.Item label="Phim">
                {selectedBooking.showtime?.movie?.title}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng chiếu">
                {selectedBooking.showtime?.room?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ chiếu">
                {dayjs(selectedBooking.showtime?.startTime).format("DD/MM/YYYY - HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={selectedBooking.status === "completed" ? "green" : "blue"}>
                  {selectedBooking.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <Text type="success" strong>
                  {selectedBooking.finalAmount?.toLocaleString("vi-VN")} đ
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space direction="vertical" style={{ width: "100%" }}>
              {selectedBooking.status === "confirmed" && (
                <Button
                  type="primary"
                  block
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  style={{ background: "#10b981", borderColor: "#10b981", height: 44 }}
                  onClick={() => handleCheckInFromList(selectedBooking._id)}
                >
                  XÁC NHẬN SOÁT VÉ
                </Button>
              )}

              <Button
                type="default"
                block
                icon={<PrinterOutlined />}
                loading={actionLoading}
                onClick={() => handlePrintTicket(selectedBooking._id)}
              >
                IN HÓA ĐƠN / VÉ GIẤY
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default StaffBookings;
