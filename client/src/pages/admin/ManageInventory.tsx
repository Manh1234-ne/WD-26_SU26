import { useEffect, useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Tooltip,
  Badge,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  InboxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { InventoryItem, CreateInventoryPayload } from "../../features/inventory/inventory.types";
import {
  getAllInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  restockInventory,
} from "../../features/inventory/inventory.service";

const { Title, Text } = Typography;

type FormFields = {
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

const defaultForm: FormFields = {
  name: "",
  unit: "suất",
  stockQuantity: 0,
  lowStockThreshold: 10,
  isActive: true,
};

function ManageInventory() {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "low_stock">("all");

  // Modal thêm / sửa
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormFields>();

  // Modal restock
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restocking, setRestocking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllInventory(true);
      setInventoryList(data);
    } catch {
      void message.error("Không thể tải danh sách tồn kho!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ─── Filtered Data ────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return inventoryList.filter((item) => {
      const avail = item.stockQuantity - item.reservedQuantity;
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchText.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "active") return item.isActive;
      if (statusFilter === "inactive") return !item.isActive;
      if (statusFilter === "low_stock") return item.isActive && avail <= item.lowStockThreshold;

      return true;
    });
  }, [inventoryList, searchText, statusFilter]);

  // ─── Statistics ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalItems = inventoryList.length;
    const totalStock = inventoryList.reduce((acc, i) => acc + (i.stockQuantity || 0), 0);
    const totalReserved = inventoryList.reduce((acc, i) => acc + (i.reservedQuantity || 0), 0);
    const lowStockCount = inventoryList.filter(
      (i) => i.isActive && (i.stockQuantity - i.reservedQuantity) <= i.lowStockThreshold
    ).length;

    return { totalItems, totalStock, totalReserved, lowStockCount };
  }, [inventoryList]);

  // ─── Open Form Modal ──────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingId(null);
    form.setFieldsValue(defaultForm);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingId(item._id);
    form.setFieldsValue({
      name: item.name,
      unit: item.unit,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleSubmitForm = async (values: FormFields) => {
    setSaving(true);
    try {
      const payload: CreateInventoryPayload = {
        name: values.name.trim(),
        unit: values.unit.trim(),
        stockQuantity: Number(values.stockQuantity),
        lowStockThreshold: Number(values.lowStockThreshold),
        isActive: values.isActive,
      };

      if (editingId) {
        await updateInventory(editingId, payload);
        void message.success("Cập nhật nguyên liệu thành công!");
      } else {
        await createInventory(payload);
        void message.success("Thêm mới nguyên liệu thành công!");
      }

      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Lưu nguyên liệu thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // ─── Restock ──────────────────────────────────────────────────────
  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockQty(10);
    setRestockOpen(true);
  };

  const handleConfirmRestock = async () => {
    if (!restockItem || restockQty <= 0) {
      void message.warning("Số lượng nhập kho phải lớn hơn 0");
      return;
    }

    setRestocking(true);
    try {
      await restockInventory(restockItem._id, restockQty);
      void message.success(`Đã nhập thêm ${restockQty} ${restockItem.unit} cho "${restockItem.name}"`);
      setRestockOpen(false);
      await loadData();
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Nhập kho thất bại!");
    } finally {
      setRestocking(false);
    }
  };

  // ─── Soft Delete ──────────────────────────────────────────────────
  const handleDelete = async (item: InventoryItem) => {
    try {
      await deleteInventory(item._id);
      void message.success(`Đã ngừng sử dụng nguyên liệu "${item.name}"`);
      await loadData();
    } catch {
      void message.error("Thao tác thất bại!");
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────
  const columns: ColumnsType<InventoryItem> = [
    {
      title: "Tên nguyên liệu",
      key: "name",
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 14, color: "#1e293b" }}>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Đơn vị: {record.unit}</Text>
        </Space>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "stockQuantity",
      key: "stockQuantity",
      width: 120,
      align: "center",
      render: (val, record) => (
        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
          {val} <Text type="secondary" style={{ fontSize: 11 }}>{record.unit}</Text>
        </span>
      ),
    },
    {
      title: "Đang giữ (Booking)",
      dataIndex: "reservedQuantity",
      key: "reservedQuantity",
      width: 150,
      align: "center",
      render: (val, record) => (
        <Tag color={val > 0 ? "orange" : "default"} style={{ borderRadius: 8, fontWeight: 600, paddingInline: 10 }}>
          {val} {record.unit}
        </Tag>
      ),
    },
    {
      title: "Có thể bán",
      key: "availableQuantity",
      width: 140,
      align: "center",
      render: (_, record) => {
        const avail = record.stockQuantity - record.reservedQuantity;
        const isLow = record.isActive && avail <= record.lowStockThreshold;

        return (
          <Space direction="vertical" size={0} align="center">
            <span style={{
              fontWeight: 800,
              fontSize: 16,
              color: isLow ? "#e11d48" : avail > 0 ? "#10b981" : "#94a3b8"
            }}>
              {avail}
            </span>
            {isLow && (
              <Tag color="error" style={{ fontSize: 10, borderRadius: 6, margin: 0, paddingInline: 6 }}>
                Sắp hết
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Ngưỡng cảnh báo",
      dataIndex: "lowStockThreshold",
      key: "lowStockThreshold",
      width: 130,
      align: "center",
      render: (val, record) => (
        <Tag style={{ borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
          ≤ {val} {record.unit}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_, record) =>
        record.isActive ? (
          <Badge status="success" text={<Text style={{ fontWeight: 600, color: "#10b981" }}>Đang dùng</Text>} />
        ) : (
          <Badge status="default" text={<Text style={{ fontWeight: 600, color: "#94a3b8" }}>Ngừng dùng</Text>} />
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Nhập kho thêm số lượng">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenRestock(record)}
              style={{ borderRadius: 6, backgroundColor: "#10b981", borderColor: "#10b981" }}
            >
              Nhập
            </Button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              shape="circle"
              size="small"
              icon={<EditOutlined style={{ color: "#f59e0b" }} />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          {record.isActive && (
            <Popconfirm
              title="Ngừng sử dụng nguyên liệu?"
              description={`Chuyển trạng thái nguyên liệu "${record.name}" sang Ngừng sử dụng?`}
              onConfirm={() => handleDelete(record)}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Ngừng sử dụng">
                <Button shape="circle" size="small" danger ghost icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        
        {/* ── Header Banner ─────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 16,
          padding: "24px 32px",
          boxShadow: "0 10px 25px rgba(15,23,42,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <Title level={2} style={{ margin: 0, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
              <InboxOutlined style={{ color: "#e11d48" }} />
              Quản Lý Tồn Kho Nguyên Liệu
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 14 }}>
              Theo dõi kho bắp nước, giữ chỗ nguyên liệu theo đặt vé và cảnh báo sắp hết hàng.
            </Text>
          </div>
          <Space wrap>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{ borderRadius: 8, fontWeight: 600, paddingInline: 20 }}
            >
              Thêm nguyên liệu
            </Button>
            <Button
              size="large"
              style={{ borderRadius: 8, fontWeight: 500 }}
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => void loadData()}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* ── Metric Cards ──────────────────────────────────────── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <Statistic
                title={<Text type="secondary" style={{ fontWeight: 600 }}>Tổng loại nguyên liệu</Text>}
                value={stats.totalItems}
                prefix={<InboxOutlined style={{ color: "#3b82f6", marginRight: 8 }} />}
                valueStyle={{ fontWeight: 800, color: "#1e293b" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <Statistic
                title={<Text type="secondary" style={{ fontWeight: 600 }}>Tổng số lượng tồn kho</Text>}
                value={stats.totalStock}
                prefix={<CheckCircleOutlined style={{ color: "#10b981", marginRight: 8 }} />}
                valueStyle={{ fontWeight: 800, color: "#10b981" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <Statistic
                title={<Text type="secondary" style={{ fontWeight: 600 }}>Đang giữ (Booking)</Text>}
                value={stats.totalReserved}
                prefix={<ThunderboltOutlined style={{ color: "#f59e0b", marginRight: 8 }} />}
                valueStyle={{ fontWeight: 800, color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card bordered={false} style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <Statistic
                title={<Text type="secondary" style={{ fontWeight: 600 }}>Cảnh báo sắp hết hàng</Text>}
                value={stats.lowStockCount}
                prefix={<WarningOutlined style={{ color: "#e11d48", marginRight: 8 }} />}
                valueStyle={{ fontWeight: 800, color: stats.lowStockCount > 0 ? "#e11d48" : "#64748b" }}
              />
            </Card>
          </Col>
        </Row>

        {/* ── Filter & Search Bar ───────────────────────────────── */}
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} sm={12} md={10}>
              <Input
                placeholder="Tìm kiếm theo tên nguyên liệu hoặc đơn vị tính..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12} md={10}>
              <Space wrap size="middle">
                <Text strong>Lọc trạng thái:</Text>
                <Select
                  size="large"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: 180, borderRadius: 8 }}
                  options={[
                    { value: "all", label: "Tất cả" },
                    { value: "active", label: "Đang sử dụng" },
                    { value: "inactive", label: "Ngừng sử dụng" },
                    { value: "low_stock", label: "⚠️ Sắp hết hàng" },
                  ]}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* ── Table List ───────────────────────────────────────── */}
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}
          styles={{ body: { padding: 0 } }}
          title={
            <Space>
              <InboxOutlined style={{ color: "#e11d48" }} />
              <Title level={4} style={{ margin: 0 }}>Danh sách kho nguyên liệu</Title>
              <Tag color="red" style={{ borderRadius: 12, fontWeight: 700 }}>{filteredData.length} nguyên liệu</Tag>
            </Space>
          }
        >
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} nguyên liệu` }}
            scroll={{ x: true }}
            rowClassName={(record) => !record.isActive ? "ant-table-row-disabled" : ""}
          />
        </Card>
      </Space>

      {/* ── Modal Thêm / Sửa nguyên liệu ────────────────────────── */}
      <Modal
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        footer={null}
        destroyOnClose
        title={
          <Space>
            <InboxOutlined style={{ color: "#e11d48" }} />
            <span style={{ fontWeight: 800 }}>
              {editingId ? "Chỉnh sửa nguyên liệu" : "Thêm mới nguyên liệu kho"}
            </span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultForm}
          onFinish={handleSubmitForm}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên nguyên liệu"
            rules={[{ required: true, message: "Vui lòng nhập tên nguyên liệu" }]}
          >
            <Input placeholder="Ví dụ: Bắp nổ ngọt, Coca-Cola 500ml, Ly giấy,..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Đơn vị tính"
                rules={[{ required: true, message: "Vui lòng nhập đơn vị tính" }]}
              >
                <Input placeholder="Ví dụ: gói, chai, ly, suất,..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stockQuantity"
                label="Số lượng tồn kho"
                rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lowStockThreshold"
                label="Ngưỡng cảnh báo"
                tooltip="Hệ thống cảnh báo sắp hết hàng khi số lượng còn bán nhỏ hơn hoặc bằng mức này"
                rules={[{ required: true, message: "Nhập ngưỡng cảnh báo" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="10" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng dùng" />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 16 }}>
            <Button onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              {editingId ? "Cập nhật" : "Tạo mới"}
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* ── Modal Nhập Kho (Restock) ─────────────────────────────── */}
      <Modal
        open={restockOpen}
        onCancel={() => setRestockOpen(false)}
        onOk={handleConfirmRestock}
        confirmLoading={restocking}
        okText="Xác nhận nhập kho"
        cancelText="Hủy"
        title={
          <Space>
            <PlusOutlined style={{ color: "#10b981" }} />
            <span style={{ fontWeight: 800 }}>Nhập kho nguyên liệu</span>
          </Space>
        }
      >
        {restockItem && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16, color: "#0f172a" }}>{restockItem.name}</Text>
              <br />
              <Text type="secondary">Tồn kho hiện tại: </Text>
              <Text strong style={{ color: "#10b981" }}>{restockItem.stockQuantity} {restockItem.unit}</Text>
            </div>

            <Form layout="vertical">
              <Form.Item label="Số lượng nhập thêm" required>
                <InputNumber
                  min={1}
                  max={100000}
                  value={restockQty}
                  onChange={(v) => setRestockQty(v ?? 1)}
                  style={{ width: "100%" }}
                  size="large"
                  addonAfter={restockItem.unit}
                />
              </Form.Item>
            </Form>

            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
              <Text style={{ fontSize: 13, color: "#166534" }}>
                Tồn kho dự kiến sau khi nhập: <strong>{restockItem.stockQuantity + (restockQty || 0)} {restockItem.unit}</strong>
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ManageInventory;
