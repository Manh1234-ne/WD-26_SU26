import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
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
} from 'antd'
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  GiftOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import {
  createVoucher,
  deleteVoucher,
  getVouchers,
  updateVoucher,
} from '../../features/voucher/voucher.service'
import type { Voucher, VoucherDiscountType, VoucherPayload } from '../../features/voucher/voucher.types'

const { Title } = Typography
const { TextArea } = Input

type VoucherFormFields = {
  code: string
  name: string
  description: string
  discountType: VoucherDiscountType
  discountValue: number
  maxDiscountAmount: number | null
  minOrderAmount: number
  usageLimit: number | null
  startDate: dayjs.Dayjs
  endDate: dayjs.Dayjs
  isActive: boolean
}

const emptyFormValues: VoucherFormFields = {
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  maxDiscountAmount: null,
  minOrderAmount: 0,
  usageLimit: null,
  startDate: dayjs(),
  endDate: dayjs().add(30, 'day'),
  isActive: true,
}

function toPayload(values: VoucherFormFields): VoucherPayload {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    description: values.description.trim(),
    discountType: values.discountType,
    discountValue: values.discountValue,
    maxDiscountAmount: values.maxDiscountAmount ?? undefined,
    minOrderAmount: values.minOrderAmount,
    usageLimit: values.usageLimit ?? undefined,
    startDate: values.startDate.format('YYYY-MM-DD'),
    endDate: values.endDate.format('YYYY-MM-DD'),
    isActive: values.isActive,
  }
}

function toFormFields(voucher: Voucher): VoucherFormFields {
  return {
    code: voucher.code,
    name: voucher.name,
    description: voucher.description || '',
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountAmount: voucher.maxDiscountAmount ?? null,
    minOrderAmount: voucher.minOrderAmount ?? 0,
    usageLimit: voucher.usageLimit ?? null,
    startDate: dayjs(voucher.startDate),
    endDate: dayjs(voucher.endDate),
    isActive: voucher.isActive ?? true,
  }
}

function ManageVoucher() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [antdForm] = Form.useForm<VoucherFormFields>()
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const loadVouchers = async () => {
    setIsLoading(true)
    try {
      const data = await getVouchers()
      setVouchers(data)
    } catch {
      void message.error('Không thể tải danh sách voucher.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadVouchers()
  }, [])

  const sortedVouchers = useMemo(
    () => [...vouchers].sort((a, b) => a.code.localeCompare(b.code)),
    [vouchers],
  )

  const handleSubmit = async (values: VoucherFormFields) => {
    setIsSaving(true)
    try {
      if (editingId) {
        await updateVoucher(editingId, toPayload(values))
        void message.success('Đã cập nhật voucher thành công!')
      } else {
        await createVoucher(toPayload(values))
        void message.success('Đã thêm voucher mới thành công!')
      }
      antdForm.resetFields()
      setEditingId(null)
      await loadVouchers()
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lưu voucher thất bại. Vui lòng kiểm tra lại dữ liệu.'
      void message.error(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingId(voucher._id)
    antdForm.setFieldsValue(toFormFields(voucher))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (voucher: Voucher) => {
    try {
      await deleteVoucher(voucher._id)
      void message.success(`Đã xóa voucher "${voucher.code}"`)
      await loadVouchers()
    } catch {
      void message.error('Xóa voucher thất bại.')
    }
  }

  const openDetails = (voucher: Voucher) => {
    setSelectedVoucher(voucher)
    setIsDetailsOpen(true)
  }

  const columns: ColumnsType<Voucher> = [
    {
      title: 'Mã voucher',
      dataIndex: 'code',
      key: 'code',
      width: 140,
    },
    {
      title: 'Tên voucher',
      dataIndex: 'name',
      key: 'name',
      width: 220,
    },
    {
      title: 'Giảm giá',
      key: 'discount',
      width: 180,
      render: (_, record) => (
        <span>
          {record.discountType === 'percent'
            ? `${record.discountValue}%`
            : `${record.discountValue.toLocaleString('vi-VN')}đ`}
        </span>
      ),
    },
    {
      title: 'Hiệu lực',
      key: 'period',
      width: 220,
      render: (_, record) => (
        <span>
          {dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => (
        <Tag color={record.isActive === false ? 'default' : 'green'}>
          {record.isActive === false ? 'Ẩn' : 'Hiển thị'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết">
            <Button type="text" onClick={() => openDetails(record)}>
              Chi tiết
            </Button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa voucher"
            description={`Bạn có chắc chắn muốn xóa voucher "${record.code}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa voucher">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <GiftOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                {editingId ? 'Cập nhật voucher' : 'Thêm voucher mới'}
              </Title>
            </Space>
          }
          extra={
            editingId && (
              <Button icon={<CloseOutlined />} size="small" onClick={() => {
                setEditingId(null)
                antdForm.resetFields()
              }}>
                Hủy sửa
              </Button>
            )
          }
        >
          <Form form={antdForm} layout="vertical" initialValues={emptyFormValues} onFinish={handleSubmit} requiredMark="optional">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="code" label="Mã voucher" rules={[{ required: true, message: 'Vui lòng nhập mã voucher' }]}> 
                  <Input placeholder="VD: SUMMER10" maxLength={20} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="name" label="Tên voucher" rules={[{ required: true, message: 'Vui lòng nhập tên voucher' }]}> 
                  <Input placeholder="VD: Giảm giá mùa hè" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="discountType" label="Loại giảm giá" rules={[{ required: true }]}> 
                  <Select options={[{ value: 'percent', label: 'Phần trăm' }, { value: 'fixed', label: 'Cố định' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true, message: 'Vui lòng nhập giá trị giảm' }]}> 
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="maxDiscountAmount" label="Giảm tối đa"> 
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="minOrderAmount" label="Đơn tối thiểu"> 
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="usageLimit" label="Giới hạn lượt dùng"> 
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}> 
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}> 
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={16}>
                <Form.Item name="description" label="Mô tả"> 
                  <TextArea rows={4} placeholder="Mô tả voucher" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="isActive" label="Trạng thái hiển thị" valuePropName="checked">
                  <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isSaving}>
                {editingId ? 'Cập nhật' : 'Thêm mới'}
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => antdForm.resetFields()}>
                Làm mới
              </Button>
            </Space>
          </Form>
        </Card>

        <Card bordered={false} style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}>
          <Table
            rowKey="_id"
            dataSource={sortedVouchers}
            columns={columns}
            loading={isLoading}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </Space>

      <Modal open={isDetailsOpen} onCancel={() => setIsDetailsOpen(false)} footer={null} title="Chi tiết voucher">
        {selectedVoucher && (
          <div>
            <p><strong>Mã:</strong> {selectedVoucher.code}</p>
            <p><strong>Tên:</strong> {selectedVoucher.name}</p>
            <p><strong>Mô tả:</strong> {selectedVoucher.description || '—'}</p>
            <p><strong>Loại giảm:</strong> {selectedVoucher.discountType === 'percent' ? 'Phần trăm' : 'Cố định'}</p>
            <p><strong>Giá trị giảm:</strong> {selectedVoucher.discountType === 'percent' ? `${selectedVoucher.discountValue}%` : `${selectedVoucher.discountValue.toLocaleString('vi-VN')}đ`}</p>
            <p><strong>Giảm tối đa:</strong> {selectedVoucher.maxDiscountAmount ? `${selectedVoucher.maxDiscountAmount.toLocaleString('vi-VN')}đ` : '—'}</p>
            <p><strong>Đơn tối thiểu:</strong> {selectedVoucher.minOrderAmount ? `${selectedVoucher.minOrderAmount.toLocaleString('vi-VN')}đ` : '0đ'}</p>
            <p><strong>Giới hạn lượt dùng:</strong> {selectedVoucher.usageLimit ?? 'Không giới hạn'}</p>
            <p><strong>Đã dùng:</strong> {selectedVoucher.usedCount ?? 0}</p>
            <p><strong>Thời gian:</strong> {dayjs(selectedVoucher.startDate).format('DD/MM/YYYY')} - {dayjs(selectedVoucher.endDate).format('DD/MM/YYYY')}</p>
            <p><strong>Trạng thái:</strong> {selectedVoucher.isActive === false ? 'Ẩn' : 'Hiển thị'}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ManageVoucher
