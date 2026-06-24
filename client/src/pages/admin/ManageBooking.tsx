import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type BookingRecord = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  movieTitle: string;
  cinemaName: string;
  roomName: string;
  showtime: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: BookingStatus;
  createdAt: string;
};

const sampleBookings: BookingRecord[] = [
  {
    id: "1",
    bookingCode: "BK2026061901",
    customerName: "Nguyễn Văn A",
    customerEmail: "nguyenvana@example.com",
    movieTitle: "The Red Horizon",
    cinemaName: "Galaxy Trần Duy Hưng",
    roomName: "Phòng 5",
    showtime: "19/06/2026 19:30",
    totalAmount: 240000,
    discountAmount: 20000,
    finalAmount: 220000,
    status: "confirmed",
    createdAt: "2026-06-19T09:12:00.000Z",
  },
  {
    id: "2",
    bookingCode: "BK2026061902",
    customerName: "Trần Thị B",
    customerEmail: "tranthib@example.com",
    movieTitle: "Mystery of the Moon",
    cinemaName: "Lotte Cinema Đống Đa",
    roomName: "Phòng 2",
    showtime: "20/06/2026 14:00",
    totalAmount: 180000,
    discountAmount: 0,
    finalAmount: 180000,
    status: "pending",
    createdAt: "2026-06-18T16:42:00.000Z",
  },
  {
    id: "3",
    bookingCode: "BK2026061903",
    customerName: "Lê Tuấn C",
    customerEmail: "letuanc@example.com",
    movieTitle: "Space Echo",
    cinemaName: "CGV Vincom",
    roomName: "Phòng 3",
    showtime: "21/06/2026 21:00",
    totalAmount: 300000,
    discountAmount: 50000,
    finalAmount: 250000,
    status: "cancelled",
    createdAt: "2026-06-18T08:17:00.000Z",
  },
];

const statusOptions = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ xác nhận", value: "pending" },
  { label: "Đã xác nhận", value: "confirmed" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Đã huỷ", value: "cancelled" },
];

const statusTag = (status: BookingStatus) => {
  switch (status) {
    case "pending":
      return <Tag color="gold">Chờ xác nhận</Tag>;
    case "confirmed":
      return <Tag color="blue">Đã xác nhận</Tag>;
    case "completed":
      return <Tag color="green">Hoàn thành</Tag>;
    case "cancelled":
      return <Tag color="red">Đã huỷ</Tag>;
    default:
      return <Tag>{status}</Tag>;
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

  const filteredBookings = useMemo(
    () =>
      sampleBookings.filter((booking) => {
        const searchLower = searchValue.trim().toLowerCase();
        if (!searchLower) {
          return statusFilter === "all";
          booking.status === statusFilter;
        }

        const matchesSearch = [
          booking.bookingCode,
          booking.customerName,
          booking.customerEmail,
          booking.movieTitle,
          booking.cinemaName,
          booking.roomName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchLower);

        const matchesStatus = statusFilter === "all";
        booking.status === statusFilter;
        return matchesSearch;
        matchesStatus;
      }),
    [searchValue, statusFilter],
  );

  const columns: ColumnsType<BookingRecord> = [
    {
      title: "Mã booking",
      dataIndex: "bookingCode",
      key: "bookingCode",
      width: 170,
      render: (value, record) => (
        <div>
          <div style={{ fontWeight: 700 }}>{value}</div>
          <Text type="secondary">{record.customerName}</Text>
        </div>
      ),
    },
    {
      title: "Khách hàng",
      dataIndex: "customerEmail",
      key: "customerEmail",
      width: 220,
      render: (_, record) => (
        <div>
          <div>{record.customerName}</div>
          <Text type="secondary">{record.customerEmail}</Text>
        </div>
      ),
    },
    {
      title: "Buổi chiếu",
      key: "showtime",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700 }}>{record.movieTitle}</div>
          <Text type="secondary">
            {record.cinemaName} · {record.roomName}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary">{record.showtime}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng giá",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700 }}>
            {formatCurrency(record.finalAmount)}
          </div>
          <Text type="secondary">
            Giảm {formatCurrency(record.discountAmount)}
          </Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status) => statusTag(status),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Hành động",
      key: "action",
      width: 130,
      render: (_, record) => (
        <Space>
          <Button size="small" danger icon={<CloseCircleOutlined />}>
            Huỷ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Booking
            </Title>
            <Text type="secondary">
              Giao diện quản lý đơn đặt vé, tìm kiếm và lọc nhanh.
            </Text>
          </div>
          <Button type="primary" icon={<ReloadOutlined />}>
            Làm mới
          </Button>
        </div>

        <Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={10}>
              <Input
                allowClear
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Tìm mã booking, khách hàng, phim hoặc rạp"
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} md={8} xl={6}>
              <Select
                value={statusFilter}
                options={statusOptions}
                onChange={(value) => setStatusFilter(value)}
                style={{ width: "100%" }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Table<BookingRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredBookings}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: "Không có booking phù hợp" }}
          />
        </Card>
      </Space>
    </section>
  );
}

export default ManageBooking;
