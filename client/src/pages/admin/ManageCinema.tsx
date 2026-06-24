import { useEffect, useState } from 'react'
import {
  createCinema,
  deleteCinema,
  getCinemaCities,
  getCinemas,
  updateCinema,
} from '../../features/cinema/cinema.service'
import type { Cinema, CinemaPayload } from '../../features/cinema/cinema.types'
import {
  Form,
  Input,
  Select,
  TimePicker,
  Switch,
  Button,
  Table,
  Space,
  Popconfirm,
  Card,
  Typography,
  Tag,
  Row,
  Col,
  message,
  Tooltip,
  Divider,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

type CinemaFormFields = {
  name: string
  phone: string
  email: string
  city: string
  district?: string
  address: string
  openingTime: dayjs.Dayjs
  closingTime: dayjs.Dayjs
  isActive: boolean
}

const emptyFormValues = {
  name: '',
  phone: '',
  email: '',
  city: '',
  district: '',
  address: '',
  openingTime: dayjs('2026-01-01 08:00'),
  closingTime: dayjs('2026-01-01 23:00'),
  isActive: true,
}

function ManageCinema() {
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [antdForm] = Form.useForm<CinemaFormFields>()

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 8,
    total: 0,
  })

  const loadCinemas = async (page = 1, limit = 8, city?: string) => {
    setIsLoading(true)
    try {
      const data = await getCinemas({ page, limit, city })
      setCinemas(data.cinemas)
      setPagination({
        current: data.pagination.page,
        pageSize: data.pagination.limit,
        total: data.pagination.total,
      })
    } catch {
      void message.error('Không thể tải danh sách rạp.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCities = async () => {
    try {
      const data = await getCinemaCities()
      setCities(data)
    } catch {
      // Bỏ qua lỗi này
    }
  }

  useEffect(() => {
    void loadCinemas(1, pagination.pageSize, selectedCity)
    void loadCities()
  }, [])

  const handleSubmit = async (values: CinemaFormFields) => {
    setIsSaving(true)
    try {
      const payload: CinemaPayload = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        city: values.city.trim(),
        district: values.district?.trim() || '',
        address: values.address.trim(),
        openingTime: values.openingTime.format('HH:mm'),
        closingTime: values.closingTime.format('HH:mm'),
        isActive: values.isActive,
      }

      if (editingId) {
        await updateCinema(editingId, payload)
        void message.success('Đã cập nhật rạp thành công!')
      } else {
        await createCinema(payload)
        void message.success('Đã thêm rạp mới thành công!')
      }

      antdForm.resetFields()
      setEditingId(null)
      await loadCinemas(pagination.current, pagination.pageSize, selectedCity)
      await loadCities()
    } catch {
      void message.error('Lưu thông tin rạp thất bại. Vui lòng kiểm tra lại dữ liệu.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (cinema: Cinema) => {
    setEditingId(cinema._id)
    antdForm.setFieldsValue({
      name: cinema.name,
      phone: cinema.phone,
      email: cinema.email,
      city: cinema.city,
      district: cinema.district || '',
      address: cinema.address,
      openingTime: dayjs(`2026-01-01 ${cinema.openingTime || '08:00'}`),
      closingTime: dayjs(`2026-01-01 ${cinema.closingTime || '23:00'}`),
      isActive: cinema.isActive ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (cinema: Cinema) => {
    try {
      await deleteCinema(cinema._id)
      void message.success(`Đã xóa rạp "${cinema.name}" thành công`)
      await loadCinemas(pagination.current, pagination.pageSize, selectedCity)
      await loadCities()
    } catch {
      void message.error('Xóa rạp thất bại.')
    }
  }

  const handleTableChange = (newPagination: any) => {
    void loadCinemas(newPagination.current, newPagination.pageSize, selectedCity)
  }

  const handleCityFilterChange = (value: string) => {
    const city = value === 'all' ? undefined : value
    setSelectedCity(city)
    void loadCinemas(1, pagination.pageSize, city)
  }

  const columns: ColumnsType<Cinema> = [
    {
      title: 'Tên rạp',
      key: 'name',
      width: 220,
      render: (_, record) => (
        <Space size={8}>
          <BankOutlined style={{ color: '#e11d48', fontSize: '16px' }} />
          <span style={{ fontWeight: 600 }}>{record.name}</span>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      key: 'address',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.address}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
            {record.district ? `${record.district}, ` : ''}{record.city}
          </div>
        </div>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: '13px' }}>
          <div>
            <PhoneOutlined style={{ color: '#8c8c8c', marginInlineEnd: '6px' }} />
            <span>{record.phone}</span>
          </div>
          <div>
            <MailOutlined style={{ color: '#8c8c8c', marginInlineEnd: '6px' }} />
            <span style={{ color: '#595959' }}>{record.email}</span>
          </div>
        </Space>
      ),
    },
    {
      title: 'Giờ hoạt động',
      key: 'hours',
      width: 160,
      render: (_, record) => (
        <Tag color="blue" icon={<ClockCircleOutlined />}>
          {record.openingTime} - {record.closingTime}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 150,
      render: (isActive?: boolean) => (
        <Tag color={isActive === false ? 'default' : 'green'}>
          {isActive === false ? 'Tạm dừng' : 'Đang hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#e11d48' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa rạp chiếu"
            description={`Bạn có chắc chắn muốn xóa rạp "${record.name}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa rạp">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* Top Form: Create / Edit Cinema */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <BankOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                {editingId ? 'Cập Nhật Thông Tin Rạp' : 'Thêm Rạp Chiếu Mới'}
              </Title>
            </Space>
          }
          extra={
            editingId && (
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={() => {
                  setEditingId(null)
                  antdForm.resetFields()
                }}
              >
                Hủy sửa
              </Button>
            )
          }
        >
          <Form
            form={antdForm}
            layout="vertical"
            initialValues={emptyFormValues}
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Tên rạp"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên rạp!' }]}
                >
                  <Input placeholder="Ví dụ: Lumora Cinema Hồ Gươm" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Số điện thoại"
                  name="phone"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại!' },
                    { pattern: /^[0-9+() -]{9,15}$/, message: 'Số điện thoại không hợp lệ!' },
                  ]}
                >
                  <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ví dụ: 02473008888" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không đúng định dạng!' },
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ví dụ: contact@lumora.vn" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Tỉnh / Thành phố"
                  name="city"
                  rules={[{ required: true, message: 'Vui lòng nhập Tỉnh/Thành phố!' }]}
                >
                  <Input prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ví dụ: Hà Nội" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Quận / Huyện" name="district">
                  <Input placeholder="Ví dụ: Hoàn Kiếm" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Địa chỉ chi tiết"
                  name="address"
                  rules={[{ required: true, message: 'Vui lòng nhập địa chỉ chi tiết!' }]}
                >
                  <Input placeholder="Ví dụ: Tầng 5, Tràng Tiền Plaza, 24 Hai Bà Trưng" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={12} md={8}>
                <Form.Item
                  label="Giờ mở cửa"
                  name="openingTime"
                  rules={[{ required: true, message: 'Chọn giờ mở cửa!' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} showNow={false} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item
                  label="Giờ đóng cửa"
                  name="closingTime"
                  rules={[{ required: true, message: 'Chọn giờ đóng cửa!' }]}
                >
                  <TimePicker format="HH:mm" style={{ width: '100%' }} showNow={false} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="isActive"
                  valuePropName="checked"
                  label="Trạng thái hoạt động"
                >
                  <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" style={{ width: '110px' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Row justify="end">
              <Col xs={24} sm={8} md={6}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    block
                    size="large"
                  >
                    {isSaving ? 'Đang lưu...' : editingId ? 'Cập Nhật Thay Đổi' : 'Thêm Rạp Mới'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Bottom Table: Cinemas List */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <BankOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                Danh Sách Rạp Chiếu
              </Title>
            </Space>
          }
          extra={
            <Space size="middle">
              <Select
                placeholder="Lọc theo thành phố"
                style={{ width: 180 }}
                onChange={handleCityFilterChange}
                value={selectedCity || 'all'}
              >
                <Select.Option value="all">Tất cả thành phố</Select.Option>
                {cities.map((city) => (
                  <Select.Option key={city} value={city}>
                    {city}
                  </Select.Option>
                ))}
              </Select>
              <Button
                type="text"
                icon={<ReloadOutlined spin={isLoading} />}
                onClick={() => {
                  void loadCinemas(pagination.current, pagination.pageSize, selectedCity)
                  void loadCities()
                }}
              >
                Tải lại
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={cinemas}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ['5', '8', '15', '30'],
            }}
            onChange={handleTableChange}
            scroll={{ x: true }}
          />
        </Card>
      </Space>
    </div>
  )
}

export default ManageCinema
