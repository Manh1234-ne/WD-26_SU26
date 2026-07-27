import { useEffect, useState } from 'react'
import {
  createRoom,
  deleteRoom,
  getRooms,
  updateRoom,
} from '../../features/room/room.service'
import { getCinemas } from '../../features/cinema/cinema.service'
import type { Room, RoomPayload } from '../../features/room/room.types'
import type { Cinema } from '../../features/cinema/cinema.types'
import {
  Form,
  Input,
  InputNumber,
  Select,
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
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CloseOutlined,
  SaveOutlined,
  LayoutOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

type RoomFormFields = {
  cinema: string
  name: string
  roomType: '2D' | '3D' | 'IMAX' | 'VIP'
  totalRows: number
  seatsPerRow: number
  capacity: number
  isActive: boolean
}

const emptyFormValues: RoomFormFields = {
  cinema: '',
  name: '',
  roomType: '2D',
  totalRows: 10,
  seatsPerRow: 10,
  capacity: 100,
  isActive: true,
}

function ManageRoom() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [antdForm] = Form.useForm<RoomFormFields>()

  const totalRows = Form.useWatch('totalRows', antdForm)
  const seatsPerRow = Form.useWatch('seatsPerRow', antdForm)

  useEffect(() => {
    if (totalRows && seatsPerRow) {
      antdForm.setFieldValue('capacity', totalRows * seatsPerRow)
    }
  }, [totalRows, seatsPerRow, antdForm])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [roomsData, cinemasData] = await Promise.all([
        getRooms(),
        getCinemas({ limit: 1000 }),
      ])
      setRooms(roomsData)
      if (cinemasData && cinemasData.cinemas) {
        setCinemas(cinemasData.cinemas)
      }
    } catch {
      void message.error('Không thể tải dữ liệu.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSubmit = async (values: RoomFormFields) => {
    setIsSaving(true)
    try {
      const payload: RoomPayload = {
        ...values,
        cinema: values.cinema || cinemas[0]?._id || '',
      }
      if (editingId) {
        await updateRoom(editingId, payload)
        void message.success('Đã cập nhật phòng thành công!')
      } else {
        await createRoom(payload)
        void message.success('Đã thêm phòng mới thành công!')
      }
      antdForm.resetFields()
      setEditingId(null)
      await loadData()
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lưu phòng thất bại. Vui lòng kiểm tra lại.'
      void message.error(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (room: Room) => {
    setEditingId(room._id)
    antdForm.setFieldsValue({
      cinema: room.cinema._id,
      name: room.name,
      roomType: room.roomType,
      totalRows: room.totalRows,
      seatsPerRow: room.seatsPerRow,
      capacity: room.capacity,
      isActive: room.isActive ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (room: Room) => {
    try {
      await deleteRoom(room._id)
      void message.success(`Đã xóa phòng "${room.name}"`)
      await loadData()
    } catch {
      void message.error('Xóa phòng thất bại.')
    }
  }

  const columns: ColumnsType<Room> = [
    {
      title: 'Tên phòng',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong style={{ color: '#e11d48' }}>{text}</strong>,
    },
    {
      title: 'Loại phòng',
      dataIndex: 'roomType',
      key: 'roomType',
      render: (type) => {
        const colors: Record<string, string> = {
          '2D': 'blue',
          '3D': 'purple',
          'IMAX': 'orange',
          'VIP': 'gold',
        }
        return <Tag color={colors[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: 'Sức chứa',
      key: 'capacity',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span><strong>{record.capacity}</strong> ghế</span>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
            ({record.totalRows} hàng x {record.seatsPerRow} ghế)
          </span>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive?: boolean) => (
        <Tag color={isActive === false ? 'default' : 'cyan'}>
          {isActive === false ? 'Ngừng hoạt động' : 'Hoạt động'}
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
            title="Xóa phòng chiếu"
            description={`Bạn có chắc chắn muốn xóa phòng "${record.name}"? Tất cả ghế của phòng cũng sẽ bị xoá.`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa phòng">
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
              <LayoutOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                {editingId ? 'Cập Nhật Phòng Chiếu' : 'Thêm Phòng Chiếu'}
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
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Tên phòng chiếu"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên phòng!' }]}
                >
                  <Input placeholder="Ví dụ: P01, P02, IMAX 1" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Loại phòng" name="roomType">
                  <Select>
                    <Select.Option value="2D">2D Tiêu chuẩn</Select.Option>
                    <Select.Option value="3D">3D Trải nghiệm</Select.Option>
                    <Select.Option value="IMAX">IMAX</Select.Option>
                    <Select.Option value="VIP">Phòng VIP</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Số hàng ghế (ngang)"
                  name="totalRows"
                  rules={[{ required: true, message: 'Nhập số hàng ghế!' }]}
                  help="VD: 10 hàng (từ A đến J)"
                >
                  <InputNumber min={1} max={26} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Số ghế mỗi hàng (dọc)"
                  name="seatsPerRow"
                  rules={[{ required: true, message: 'Nhập số ghế mỗi hàng!' }]}
                  help="VD: 10 ghế mỗi hàng"
                >
                  <InputNumber min={1} max={50} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Tổng sức chứa"
                  name="capacity"
                  help="Hệ thống tự tính toán"
                >
                  <InputNumber style={{ width: '100%' }} readOnly disabled />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24} align="bottom" style={{ marginTop: '16px' }}>
              <Col xs={24} sm={8} md={6}>
                <Form.Item
                  name="isActive"
                  valuePropName="checked"
                  label="Trạng thái"
                  style={{ marginBottom: 0 }}
                >
                  <Switch checkedChildren="Hoạt động" unCheckedChildren="Bảo trì" style={{ width: '100px' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    block
                    size="large"
                  >
                    {isSaving ? 'Đang lưu...' : editingId ? 'Cập Nhật Phòng' : 'Tạo Phòng Chiếu'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <HomeOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                Danh Sách Phòng Chiếu
              </Title>
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<ReloadOutlined spin={isLoading} />}
              onClick={loadData}
            >
              Tải lại
            </Button>
          }
        >
          <Table
            dataSource={rooms}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: true }}
          />
        </Card>
      </Space>
    </div>
  )
}

export default ManageRoom
