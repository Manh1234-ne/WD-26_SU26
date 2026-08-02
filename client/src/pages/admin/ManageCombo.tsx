import { useEffect, useState } from "react";
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
  Divider,
  Avatar,
  Badge,
  Empty,
  Spin,
  Upload,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
  CloseOutlined,
  ShoppingOutlined,
  PictureOutlined,
  MinusCircleOutlined,
  AppstoreAddOutlined,
  EyeOutlined,
  CoffeeOutlined,
  UploadOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Combo, ComboIngredient, ComboPayload, InventoryItem } from "../../features/combo/combo.types";
import {
  getAllCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  getAllInventoryItems,
} from "../../features/combo/combo.service";

const { Title, Text } = Typography;
const { TextArea } = Input;

type IngredientRow = {
  key: string;
  inventoryItem: string;
  quantity: number;
};

type ComboFormFields = {
  name: string;
  description: string;
  image: string;
  price: number;
  isActive: boolean;
};

const emptyForm: ComboFormFields = {
  name: "",
  description: "",
  image: "",
  price: 0,
  isActive: true,
};

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

function getInventoryName(item: InventoryItem | string, inventoryList: InventoryItem[]) {
  if (typeof item === "object" && item !== null) {
    return item.name;
  }
  if (typeof item === "string") {
    return inventoryList.find((i) => i._id === item)?.name ?? item;
  }
  return String(item);
}

function getInventoryUnit(item: InventoryItem | string, inventoryList: InventoryItem[]) {
  if (typeof item === "object" && item !== null) {
    return item.unit;
  }
  if (typeof item === "string") {
    return inventoryList.find((i) => i._id === item)?.unit ?? "";
  }
  return item.unit;
}

function isIngredientActive(item: InventoryItem | string, inventoryList: InventoryItem[]) {
  if (typeof item === "object" && item !== null) {
    if (item.isActive === false) return false;
    const inv = inventoryList.find((i) => i._id === item._id);
    return inv ? inv.isActive !== false : true;
  }
  if (typeof item === "string") {
    const inv = inventoryList.find((i) => i._id === item);
    return inv ? inv.isActive !== false : true;
  }
  return true;
}

function ManageCombo() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form trạng thái
  const [form] = Form.useForm<ComboFormFields>();
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // Modal xem chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [combosData, inventoryData] = await Promise.all([
        getAllCombos(true),
        getAllInventoryItems(),
      ]);
      setCombos(combosData);
      setInventoryList(inventoryData);
    } catch {
      void message.error("Không thể tải dữ liệu combo!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ─── Filter list inventory items (chỉ lấy items active) ──────────────
  const activeInventoryList = inventoryList.filter((inv) => inv.isActive !== false);

  // ─── Multi-select handler ─────────────────────────────────────────
  const handleMultiSelectChange = (selectedIds: string[]) => {
    setIngredients((prev) => {
      // Giữ lại các dòng bị inactive (nguyên liệu đã ngừng bán trong combo cũ)
      const inactiveRows = prev.filter((r) => {
        if (!r.inventoryItem) return false;
        return !isIngredientActive(r.inventoryItem, inventoryList);
      });

      // Tạo hoặc giữ các dòng active tương ứng với selectedIds
      const activeRows: IngredientRow[] = selectedIds.map((id) => {
        const existingRow = prev.find((r) => r.inventoryItem === id);
        return (
          existingRow || {
            key: `multi-${id}-${Date.now()}`,
            inventoryItem: id,
            quantity: 1,
          }
        );
      });

      return [...inactiveRows, ...activeRows];
    });
  };

  // ─── Ingredient helpers ───────────────────────────────────────────
  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { key: Date.now().toString(), inventoryItem: "", quantity: 1 },
    ]);
  };

  const removeIngredient = (key: string) => {
    setIngredients((prev) => prev.filter((r) => r.key !== key));
  };

  const updateIngredient = (key: string, field: keyof IngredientRow, value: string | number) => {
    setIngredients((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const extractImageUrl = (imageField: any): string => {
    if (!imageField) return "";

    if (typeof imageField === "string") return imageField.trim();

    const list = Array.isArray(imageField)
      ? imageField
      : imageField?.fileList ?? [];
    const done = list.find((f: any) => f.status === "done");
    return done?.response?.url ?? done?.url ?? "";
  };

  const handleSubmit = async (values: ComboFormFields) => {

    const hasEmpty = ingredients.some((r) => !r.inventoryItem);
    if (hasEmpty) {
      void message.warning("Vui lòng chọn nguyên liệu cho tất cả các dòng!");
      return;
    }

    // Cảnh báo nếu còn nguyên liệu đã ngừng bán chưa được xóa hoặc thay thế
    const hasStoppedIngredient = ingredients.some(
      (r) => !isIngredientActive(r.inventoryItem, inventoryList)
    );
    if (hasStoppedIngredient) {
      void message.error("Combo còn chứa nguyên liệu đã NGỪNG BÁN! Vui lòng xóa hoặc thay thế bằng nguyên liệu khác.");
      return;
    }

    const payload: ComboPayload = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      image: extractImageUrl(values.image),
      price: Number(values.price),
      isActive: values.isActive,
      ingredients: ingredients
        .filter((r) => r.inventoryItem)
        .map((r) => ({ inventoryItem: r.inventoryItem, quantity: Number(r.quantity) })),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateCombo(editingId, payload);
        void message.success("Đã cập nhật combo thành công!");
      } else {
        await createCombo(payload);
        void message.success("Đã thêm combo mới thành công!");
      }
      form.resetFields();
      setIngredients([]);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      void message.error(err?.response?.data?.message || "Lưu combo thất bại!");
    } finally {
      setSaving(false);
    }
  };
  const handleImageUploadChange = (info: any) => {
    if (info.file.status === "done") {
      const url = info.file.response?.url;
      if (url) {
        form.setFieldValue('image', url);
        void message.success("Upload ảnh thành công!");
      } else {
        void message.error("Upload thành công nhưng không nhận được URL!");
      }
    } else if (info.file.status === "error") {
      const errMsg = info.file.response?.message || "Upload ảnh thất bại!";
      void message.error(errMsg);
    }
  };

  const beforeImageUpload = (file: any) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
    if (!isJpgOrPng) {
      void message.error('Chỉ chấp nhận file JPG, PNG hoặc WEBP!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      void message.error('Ảnh phải nhỏ hơn 2MB!');
    }
    return isJpgOrPng && isLt2M;
  };

  const handleEdit = (combo: Combo) => {
    setEditingId(combo._id);
    form.setFieldsValue({
      name: combo.name,
      description: combo.description || "",
      image: combo.image || "",
      price: combo.price,
      isActive: combo.isActive,
    });

    // Populate ingredients
    const rows: IngredientRow[] = (combo.ingredients || []).map((ing: ComboIngredient, i) => {
      const itemId = typeof ing.inventoryItem === "string" ? ing.inventoryItem : ing.inventoryItem._id;
      return {
        key: `edit-${i}-${Date.now()}`,
        inventoryItem: itemId,
        quantity: ing.quantity,
      };
    });
    setIngredients(rows);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (combo: Combo) => {
    try {
      await deleteCombo(combo._id);
      void message.success(`Đã ngừng bán combo "${combo.name}"`);
      await loadData();
    } catch {
      void message.error("Thao tác thất bại!");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.resetFields();
    setIngredients([]);
  };

  // ─── Tính toán options còn lại (tránh chọn trùng & lọc active) ─────
  const selectedItemIds = ingredients.map((r) => r.inventoryItem).filter(Boolean);
  const availableForRow = (currentKey: string) => {
    const currentItem = ingredients.find((r) => r.key === currentKey)?.inventoryItem;
    return inventoryList.filter(
      (inv) =>
        (!selectedItemIds.includes(inv._id) || inv._id === currentItem) &&
        (inv.isActive !== false || inv._id === currentItem)
    );
  };

  // Kiểm tra form có đang chứa nguyên liệu ngừng bán không
  const hasInactiveIngredientsInForm = ingredients.some(
    (r) => r.inventoryItem && !isIngredientActive(r.inventoryItem, inventoryList)
  );

  // ─── Columns Table ────────────────────────────────────────────────
  const columns: ColumnsType<Combo> = [
    {
      title: "Combo",
      key: "combo",
      width: 260,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {record.image ? (
            <img
              src={record.image}
              alt={record.name}
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                objectFit: "cover",
                border: "1px solid #f1f5f9",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              }}
            />
          ) : (
            <Avatar
              size={52}
              shape="square"
              style={{ backgroundColor: "#fef3c7", color: "#d97706", borderRadius: 8 }}
              icon={<CoffeeOutlined />}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{record.name}</span>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 11, maxWidth: 160 }} ellipsis>
                {record.description}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Nguyên liệu",
      key: "ingredients",
      render: (_, record) => {
        const ings = record.ingredients || [];
        if (!ings.length) return <Text type="secondary" style={{ fontSize: 12 }}>Chưa có</Text>;
        return (
          <Space wrap size={4}>
            {ings.map((ing, i) => {
              const active = isIngredientActive(ing.inventoryItem, inventoryList);
              const name = getInventoryName(ing.inventoryItem, inventoryList);
              return (
                <Tag
                  key={i}
                  color={active ? "blue" : "error"}
                  style={{ borderRadius: 6, fontSize: 11, fontWeight: active ? 500 : 700 }}
                >
                  {!active && <WarningOutlined style={{ marginRight: 4 }} />}
                  {name} ×{ing.quantity}
                  {!active && " (Ngừng bán)"}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      key: "price",
      width: 140,
      render: (val) => (
        <span style={{ fontWeight: 800, color: "#e11d48", fontSize: 14 }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_, record) =>
        record.isActive ? (
          <Badge status="success" text={<Text style={{ fontWeight: 600, color: "#10b981" }}>Đang bán</Text>} />
        ) : (
          <Badge status="default" text={<Text style={{ fontWeight: 600, color: "#94a3b8" }}>Ngừng bán</Text>} />
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết">
            <Button
              shape="circle"
              icon={<EyeOutlined style={{ color: "#3b82f6" }} />}
              onClick={() => {
                setSelectedCombo(record);
                setDetailOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              shape="circle"
              icon={<EditOutlined style={{ color: "#f59e0b" }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Ngừng bán combo?"
            description={`Combo "${record.name}" sẽ bị ẩn khỏi menu đặt vé.`}
            onConfirm={() => handleDelete(record)}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Ngừng bán">
              <Button shape="circle" danger ghost icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .combo-card { transition: all 0.25s ease; }
          .combo-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(225,29,72,0.10) !important; }
          .ingredient-row { background: #f8fafc; border-radius: 8px; padding: 12px 16px; border: 1px solid #e2e8f0; margin-bottom: 8px; transition: border-color 0.2s; }
          .ingredient-row:hover { border-color: #e11d48; }
          .ingredient-row.inactive { background: #fef2f2; border-color: #fca5a5; }
          .ant-table-thead > tr > th { background: #f1f5f9 !important; font-weight: 700 !important; color: #334155 !important; }
        `
      }} />

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
              <ShoppingOutlined style={{ color: "#e11d48" }} />
              Quản Lý Combo Bắp Nước
            </Title>
            <Text style={{ color: "#94a3b8", fontSize: 14 }}>
              Thiết lập combo đồ ăn kèm vé xem phim, quản lý nguyên liệu và giá bán.
            </Text>
          </div>
          <Button
            size="large"
            style={{ borderRadius: 8, fontWeight: 500 }}
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => void loadData()}
          >
            Làm mới
          </Button>
        </div>

        {/* ── Form thêm / sửa combo ─────────────────────────────── */}
        <Card
          bordered={false}
          className="combo-card"
          style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
          title={
            <Space>
              <AppstoreAddOutlined style={{ color: "#e11d48", fontSize: 20 }} />
              <Title level={4} style={{ margin: 0 }}>
                {editingId ? "Cập nhật combo" : "Thêm combo mới"}
              </Title>
            </Space>
          }
          extra={
            editingId && (
              <Button icon={<CloseOutlined />} size="small" onClick={handleCancelEdit}>
                Hủy sửa
              </Button>
            )
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={emptyForm}
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Row gutter={[16, 0]}>
              {/* Tên combo */}
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="name"
                  label="Tên combo"
                  rules={[{ required: true, message: "Vui lòng nhập tên combo" }]}
                >
                  <Input
                    placeholder="VD: Combo Đôi Bắp Lớn + 2 Nước"
                    prefix={<ShoppingOutlined style={{ color: "#94a3b8" }} />}
                  />
                </Form.Item>
              </Col>

              {/* Giá bán */}
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="price"
                  label="Giá bán (VND)"
                  rules={[
                    { required: true, message: "Vui lòng nhập giá bán" },
                    { type: "number", min: 0, message: "Giá không hợp lệ" },
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={5000}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => Number(v?.replace(/,/g, "") ?? 0) as 0}
                    style={{ width: "100%" }}
                    addonAfter="VND"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Form.Item name="isActive" label="Trạng thái bán" valuePropName="checked">
                  <Switch
                    checkedChildren="Đang bán"
                    unCheckedChildren="Ngừng bán"
                    style={{ minWidth: 100 }}
                  />
                </Form.Item>
              </Col>

              {/* Upload Ảnh file từ máy hoặc nhập URL */}
              <Col xs={24} md={16}>
                <Form.Item label="Hình ảnh combo (Chọn file từ máy hoặc dán URL)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Form.Item name="image" noStyle>
                      <Input
                        placeholder="Dán đường dẫn URL hoặc bấm Chọn file bên cạnh..."
                        prefix={<PictureOutlined style={{ color: "#94a3b8" }} />}
                        style={{ borderRadius: 8, flex: 1 }}
                      />
                    </Form.Item>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={async (file) => {
                        try {
                          const compressedBase64 = await compressImage(file, 600, 0.7);
                          form.setFieldValue("image", compressedBase64);
                          void message.success("Đã chọn và nén ảnh thành công!");
                        } catch {
                          void message.error("Lỗi khi xử lý file ảnh!");
                        }
                        return false;
                      }}
                    >
                      <Button icon={<UploadOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
                        Chọn file ảnh
                      </Button>
                    </Upload>
                  </div>
                </Form.Item>
              </Col>

              {/* Preview hình */}
              <Col xs={24} md={8}>
                <Form.Item label="Xem trước ảnh">
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.image !== curr.image}>
                    {({ getFieldValue }) => {
                      const url = getFieldValue("image");
                      return url ? (
                        <img
                          src={url}
                          alt="preview"
                          style={{
                            width: "100%",
                            maxHeight: 80,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            overflow: "hidden",
                          }}>
                          <img
                            src={url}
                            alt="preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          flex: "1 1 60%",
                          height: 160,
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px dashed #cbd5e1",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontSize: 12,
                          gap: 6,
                        }}>
                          <PictureOutlined style={{ fontSize: 28 }} />
                          <span>Chưa có ảnh</span>
                        </div>
                      );
                    }}
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>


            {/* Mô tả */}
            <Col xs={24}>
              <Form.Item name="description" label="Mô tả combo">
                <TextArea
                  rows={3}
                  placeholder="Mô tả chi tiết về combo (thành phần, khuyến mãi,...)"
                  showCount
                  maxLength={300}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Nguyên liệu ─────────────────────────────────────── */}
          <Divider orientation={"left" as any} style={{ color: "#475569", fontWeight: 700, borderColor: "#e2e8f0" }}>
            <Space>
              <CoffeeOutlined style={{ color: "#e11d48" }} />
              Nguyên liệu của combo
            </Space>
          </Divider>

          {/* Warning if combo has stopped ingredients */}
          {hasInactiveIngredientsInForm && (
            <Alert
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="Cảnh báo nguyên liệu đã ngừng bán"
              description="Combo này đang chứa nguyên liệu đã bị Ngừng bán ở Quản Lý Tồn Kho. Vui lòng bấm biểu tượng Xóa (thùng rác) hoặc chọn thay thế nguyên liệu khác trước khi lưu combo!"
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Spin tip="Đang tải danh sách nguyên liệu..." />
            </div>
          ) : (
            <div>
              {/* Multi-select chọn nhanh nhiều nguyên liệu */}
              <div style={{ background: "#f1f5f9", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, color: "#334155", display: "block", marginBottom: 8 }}>
                  <PlusOutlined style={{ color: "#e11d48", marginRight: 6 }} />
                  Chọn nhanh nhiều nguyên liệu vào combo cùng lúc:
                </Text>
                <Select
                  mode="multiple"
                  placeholder="Bấm vào đây để chọn nhanh nhiều nguyên liệu (bắp, nước, snack...)..."
                  value={ingredients
                    .map((r) => r.inventoryItem)
                    .filter((id) => isIngredientActive(id, inventoryList))}
                  onChange={handleMultiSelectChange}
                  options={activeInventoryList.map((inv) => ({
                    value: inv._id,
                    label: `${inv.name} (${inv.unit})`,
                  }))}
                  style={{ width: "100%" }}
                  allowClear
                />
              </div>

              {ingredients.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text type="secondary">Chưa có nguyên liệu nào. Hãy chọn ở ô trên hoặc nhấn "Thêm dòng nguyên liệu".</Text>
                  }
                  style={{ marginBottom: 16 }}
                />
              ) : (
                ingredients.map((row) => {
                  const isInactive = row.inventoryItem && !isIngredientActive(row.inventoryItem, inventoryList);
                  return (
                    <div key={row.key} className={`ingredient-row ${isInactive ? "inactive" : ""}`}>
                      <Row gutter={12} align="middle">
                        <Col xs={24} sm={12} md={13}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Nguyên liệu</Text>
                              {isInactive && (
                                <Tag color="error" style={{ borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                  ⚠️ NGỪNG BÁN (Hãy xóa/thay thế)
                                </Tag>
                              )}
                            </div>
                            <Select
                              value={row.inventoryItem || undefined}
                              onChange={(val) => updateIngredient(row.key, "inventoryItem", val)}
                              placeholder="Chọn nguyên liệu..."
                              showSearch
                              filterOption={(input, opt) =>
                                String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                              }
                              options={availableForRow(row.key).map((inv) => {
                                const stopped = inv.isActive === false;
                                return {
                                  value: inv._id,
                                  label: `${inv.name} (${inv.unit})${stopped ? " - ⚠️ [ĐÃ NGỪNG BÁN]" : ""}`,
                                  disabled: stopped && inv._id !== row.inventoryItem,
                                };
                              })}
                              style={{ width: "100%" }}
                              status={!row.inventoryItem || isInactive ? "error" : undefined}
                            />
                          </div>
                        </Col>
                        <Col xs={18} sm={8} md={8}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                              Số lượng
                              {row.inventoryItem && (
                                <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>
                                  ({getInventoryUnit(row.inventoryItem, inventoryList)})
                                </span>
                              )}
                            </Text>
                            <InputNumber
                              min={1}
                              max={99}
                              value={row.quantity}
                              onChange={(v) => updateIngredient(row.key, "quantity", v ?? 1)}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </Col>
                        <Col xs={6} sm={4} md={3} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 0 }}>
                          <Tooltip title={isInactive ? "Xóa nguyên liệu đã ngừng bán này" : "Xóa dòng"}>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined style={{ fontSize: 18 }} />}
                              onClick={() => removeIngredient(row.key)}
                              style={{ marginTop: 22 }}
                            />
                          </Tooltip>
                        </Col>
                      </Row>
                    </div>
                  );
                })
              )}

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addIngredient}
                disabled={ingredients.length >= inventoryList.length}
                style={{
                  width: "100%",
                  borderRadius: 8,
                  borderColor: "#e11d48",
                  color: "#e11d48",
                  fontWeight: 600,
                  marginTop: ingredients.length ? 4 : 0,
                }}
              >
                Thêm dòng nguyên liệu
              </Button>
            </div>
          )}

          <Divider style={{ borderColor: "#f1f5f9" }} />

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size="large"
              style={{ borderRadius: 8, paddingInline: 28 }}
            >
              {editingId ? "Cập nhật combo" : "Thêm combo mới"}
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => {
                form.resetFields();
                setIngredients([]);
              }}
              style={{ borderRadius: 8 }}
            >
              Làm mới form
            </Button>
          </Space>
        </Form>
      </Card>

      {/* ── Bảng danh sách combo ──────────────────────────────── */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space>
            <ShoppingOutlined style={{ color: "#e11d48" }} />
            <Title level={4} style={{ margin: 0 }}>Danh sách combo</Title>
            <Tag color="red" style={{ borderRadius: 12, fontWeight: 700 }}>{combos.length} combo</Tag>
          </Space>
        }
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={combos}
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (t) => `Tổng ${t} combo` }}
          scroll={{ x: true }}
          rowClassName={(record) => !record.isActive ? "ant-table-row-disabled" : ""}
        />
      </Card>
    </Space>

      {/* ── Modal chi tiết combo ──────────────────────────────────── */ }
  <Modal
    open={detailOpen}
    onCancel={() => setDetailOpen(false)}
    footer={null}
    width={520}
    title={
      <Space>
        <ShoppingOutlined style={{ color: "#e11d48" }} />
        <span style={{ fontWeight: 800 }}>Chi tiết combo</span>
      </Space>
    }
  >
    {selectedCombo && (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {selectedCombo.image && (
          <img
            src={selectedCombo.image}
            alt={selectedCombo.name}
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid #f1f5f9",
            }}
          />
        )}

        <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px 20px" }}>
          <Title level={4} style={{ margin: "0 0 4px 0", color: "#1e293b" }}>{selectedCombo.name}</Title>
          {selectedCombo.description && (
            <Text type="secondary" style={{ fontSize: 13 }}>{selectedCombo.description}</Text>
          )}
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <div style={{ background: "#fff0f3", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Giá bán</Text>
              <Text style={{ fontSize: 20, fontWeight: 900, color: "#e11d48" }}>{formatCurrency(selectedCombo.price)}</Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ background: selectedCombo.isActive ? "#f0fdf4" : "#f8fafc", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
              <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", fontWeight: 700, textTransform: "uppercase" }}>Trạng thái</Text>
              <Tag
                color={selectedCombo.isActive ? "success" : "default"}
                style={{ fontWeight: 700, fontSize: 13, marginTop: 4, borderRadius: 8 }}
              >
                {selectedCombo.isActive ? "Đang bán" : "Ngừng bán"}
              </Tag>
            </div>
          </Col>
        </Row>

        <div>
          <Text strong style={{ fontSize: 13, color: "#475569", display: "block", marginBottom: 8 }}>
            <CoffeeOutlined style={{ color: "#e11d48", marginRight: 6 }} />
            Nguyên liệu ({(selectedCombo.ingredients || []).length} loại)
          </Text>
          {(selectedCombo.ingredients || []).length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>Chưa thiết lập nguyên liệu</Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(selectedCombo.ingredients || []).map((ing, i) => {
                const active = isIngredientActive(ing.inventoryItem, inventoryList);
                const name = getInventoryName(ing.inventoryItem, inventoryList);
                const unit = getInventoryUnit(ing.inventoryItem, inventoryList);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: active ? "#f8fafc" : "#fef2f2",
                      borderRadius: 8,
                      padding: "8px 14px",
                      border: active ? "1px solid #e2e8f0" : "1px solid #fca5a5",
                    }}
                  >
                    <Text style={{ fontWeight: 600, color: active ? "#334155" : "#991b1b" }}>
                      {!active && <WarningOutlined style={{ color: "#ef4444", marginRight: 6 }} />}
                      {name} {!active && "(Đã ngừng bán)"}
                    </Text>
                    <Tag color={active ? "blue" : "error"} style={{ fontWeight: 700, borderRadius: 6 }}>
                      ×{ing.quantity} {unit}
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Button block onClick={() => { setDetailOpen(false); handleEdit(selectedCombo); }} icon={<EditOutlined />}>
          Chỉnh sửa combo này
        </Button>
      </div>
    )}
  </Modal>
    </div >
  );
}

export default ManageCombo;
