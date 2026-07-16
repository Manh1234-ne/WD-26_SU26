import { useEffect, useState, useCallback } from "react";
import {
  Table, Tag, Button, Input, Select, Space, Card, Typography,
  Popconfirm, Modal, Form, message, Avatar, Badge, Tooltip, Row, Col,
} from "antd";
import {
  SearchOutlined, ReloadOutlined, UserOutlined,
  LockOutlined, UnlockOutlined, DeleteOutlined, EditOutlined,
  CrownOutlined, TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { api } from "../../services/api";

const { Title, Text } = Typography;

type UserRole = "admin" | "staff" | "customer";

type UserRecord = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  dateOfBirth?: string;
  createdAt?: string;
};

const ROLE_OPTIONS = [
  { label: "Tất cả", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Nhân viên", value: "staff" },
  { label: "Khách hàng", value: "customer" },
];

const ROLE_EDIT_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Nhân viên", value: "staff" },
  { label: "Khách hàng", value: "customer" },
];

const roleConfig: Record<UserRole, { color: string; label: string; icon: React.ReactNode }> = {
  admin: { color: "red", label: "Admin", icon: <CrownOutlined /> },
  staff: { color: "blue", label: "Nhân viên", icon: <TeamOutlined /> },
  customer: { color: "default", label: "Khách hàng", icon: <UserOutlined /> },
};

function ManageUser() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal sửa vai trò
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== "all") params.role = roleFilter;

      const res = await api.get("/users", { params });
      setUsers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Khi thay đổi filter → reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await api.patch(`/users/${user._id}/toggle-active`);
      void message.success(user.isActive ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản");
      void fetchUsers();
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`);
      void message.success("Đã xoá người dùng");
      void fetchUsers();
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Xoá thất bại");
    }
  };

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user);
    editForm.setFieldsValue({ role: user.role });
  };

  const handleEditRole = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const values = await editForm.validateFields();
      await api.patch(`/users/${editingUser._id}/role`, { role: values.role });
      void message.success("Cập nhật vai trò thành công");
      setEditingUser(null);
      void fetchUsers();
    } catch (err: any) {
      if (err?.response) {
        void message.error(err?.response?.data?.message || "Cập nhật thất bại");
      }
    } finally {
      setEditLoading(false);
    }
  };

  const columns: ColumnsType<UserRecord> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.avatar || undefined}
            icon={!record.avatar ? <UserOutlined /> : undefined}
            style={{ background: record.isActive ? "#e11d48" : "#94a3b8" }}
          />
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{record.fullName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 140,
      render: (phone) => phone || <Text type="secondary">—</Text>,
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 140,
      render: (role: UserRole) => {
        const cfg = roleConfig[role];
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Hoạt động" />
        ) : (
          <Badge status="error" text="Đã khoá" />
        ),
    },
    {
      title: "Ngày tham gia",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date) =>
        date ? dayjs(date).format("DD/MM/YYYY") : <Text type="secondary">—</Text>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa vai trò">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#0ea5e9" }} />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? "Khoá tài khoản" : "Mở khoá"}>
            <Popconfirm
              title={record.isActive ? "Khoá tài khoản này?" : "Mở khoá tài khoản này?"}
              description={
                record.isActive
                  ? "Người dùng sẽ không thể đăng nhập sau khi khoá."
                  : "Người dùng có thể đăng nhập lại."
              }
              onConfirm={() => void handleToggleActive(record)}
              okText={record.isActive ? "Khoá" : "Mở khoá"}
              cancelText="Hủy"
              okButtonProps={{ danger: record.isActive }}
            >
              <Button
                type="text"
                icon={
                  record.isActive
                    ? <LockOutlined style={{ color: "#f59e0b" }} />
                    : <UnlockOutlined style={{ color: "#10b981" }} />
                }
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Xoá người dùng">
            <Popconfirm
              title="Xoá người dùng này?"
              description="Thao tác không thể hoàn tác."
              onConfirm={() => void handleDelete(record._id)}
              okText="Xoá"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined style={{ color: "#e11d48" }} />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <section style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Quản lý Người Dùng</Title>
            <Text type="secondary">
              Danh sách tất cả tài khoản đã đăng ký — tổng cộng{" "}
              <strong>{total}</strong> người dùng.
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => void fetchUsers()}
            type="text"
          >
            Tải lại
          </Button>
        </div>

        {/* Bộ lọc */}
        <Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={14} xl={10}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tìm tên, email, số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={24} md={8} xl={6}>
              <Select
                value={roleFilter}
                options={ROLE_OPTIONS}
                onChange={setRoleFilter}
                style={{ width: "100%" }}
              />
            </Col>
          </Row>
        </Card>

        {/* Bảng dữ liệu */}
        <Card>
          <Table<UserRecord>
            rowKey="_id"
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showTotal: (t) => `Tổng ${t} người dùng`,
              showSizeChanger: false,
            }}
            scroll={{ x: true }}
            locale={{ emptyText: "Không tìm thấy người dùng nào" }}
          />
        </Card>
      </Space>

      {/* Modal sửa vai trò */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: "#e11d48" }} />
            <span>Cập nhật vai trò — {editingUser?.fullName}</span>
          </Space>
        }
        open={!!editingUser}
        onCancel={() => setEditingUser(null)}
        onOk={() => void handleEditRole()}
        confirmLoading={editLoading}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        okButtonProps={{ style: { background: "#e11d48", borderColor: "#e11d48" } }}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Email"
          >
            <Input value={editingUser?.email} disabled />
          </Form.Item>
          <Form.Item
            name="role"
            label="Vai trò mới"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select options={ROLE_EDIT_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

export default ManageUser;
