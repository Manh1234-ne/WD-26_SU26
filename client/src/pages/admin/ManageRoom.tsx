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
  Modal,
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
  aisleColumns: string
  aisleRows: string
}

const emptyFormValues: RoomFormFields = {
  cinema: '',
  name: '',
  roomType: '2D',
  totalRows: 10,
  seatsPerRow: 10,
  capacity: 100,
  isActive: true,
  aisleColumns: '',
  aisleRows: '',
}

function ManageRoom() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [antdForm] = Form.useForm<RoomFormFields>()

  const totalRows = Form.useWatch('totalRows', antdForm)
  const seatsPerRow = Form.useWatch('seatsPerRow', antdForm)
  const aisleColumnsVal = Form.useWatch('aisleColumns', antdForm)
  const aisleRowsVal = Form.useWatch('aisleRows', antdForm)

  const parsedAisles = aisleColumnsVal
    ? aisleColumnsVal.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n))
    : []

  const parsedAisleRows = aisleRowsVal
    ? aisleRowsVal.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
    : []

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
      const parsedAisle = values.aisleColumns
        ? values.aisleColumns.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        : []
      const parsedAisleRowsSubmit = values.aisleRows
        ? values.aisleRows.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        : []
      const payload: RoomPayload = {
        cinema: values.cinema || cinemas[0]?._id || '',
        name: values.name,
        roomType: values.roomType,
        totalRows: values.totalRows,
        seatsPerRow: values.seatsPerRow,
        capacity: values.capacity,
        isActive: values.isActive,
        aisleColumns: parsedAisle,
        aisleRows: parsedAisleRowsSubmit,
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
      aisleColumns: room.aisleColumns ? room.aisleColumns.join(', ') : '',
      aisleRows: room.aisleRows ? room.aisleRows.join(', ') : '',
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
                  help="Tối đa 15 hàng (từ A đến O)"
                >
                  <InputNumber min={1} max={15} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Số ghế mỗi hàng (dọc)"
                  name="seatsPerRow"
                  rules={[{ required: true, message: 'Nhập số ghế mỗi hàng!' }]}
                  help="Tối đa 20 ghế mỗi hàng"
                >
                  <InputNumber min={1} max={20} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Tổng sức chứa"
                  name="capacity"
                  help="Tự tính toán (tối đa 300 ghế)"
                >
                  <InputNumber style={{ width: '100%' }} readOnly disabled />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Vị trí cột làm lối đi dọc (aisleColumns)"
                  name="aisleColumns"
                  help="Nhập số cột muốn để trống làm lối đi dọc, cách nhau bằng dấu phẩy. Ví dụ: 5, 15"
                >
                  <Input placeholder="Ví dụ: 5, 15" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Vị trí hàng làm lối đi ngang (aisleRows)"
                  name="aisleRows"
                  help="Nhập chữ cái hàng muốn để lối đi ngang phía sau, cách nhau bằng dấu phẩy. Ví dụ: E, H"
                >
                  <Input placeholder="Ví dụ: E, H" />
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
                  <Space style={{ width: '100%', justifyContent: 'end' }} wrap>
                    <Button
                      type="default"
                      size="large"
                      onClick={() => {
                        if (!totalRows || !seatsPerRow) {
                          void message.warning('Vui lòng nhập số hàng và số ghế trước khi xem trước!')
                          return
                        }
                        setIsPreviewOpen(true)
                      }}
                      style={{
                        borderColor: '#e11d48',
                        color: '#e11d48',
                        fontWeight: 600,
                        borderRadius: '8px'
                      }}
                    >
                      Xem trước sơ đồ ghế
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={isSaving}
                      size="large"
                      style={{
                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                        borderColor: '#e11d48',
                        fontWeight: 700,
                        borderRadius: '8px',
                        minWidth: '150px'
                      }}
                    >
                      {isSaving ? 'Đang lưu...' : editingId ? 'Cập Nhật Phòng' : 'Tạo Phòng Chiếu'}
                    </Button>
                  </Space>
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

      <Modal
        title={
          <strong style={{ fontSize: '16px', color: '#0f172a' }}>
            Xem Trước Sơ Đồ Ghế Phòng Chiếu ({totalRows || 0} Hàng x {seatsPerRow || 0} Ghế)
          </strong>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setIsPreviewOpen(false)}
            style={{ background: '#e11d48', borderColor: '#e11d48' }}
          >
            Đóng xem trước
          </Button>
        ]}
        width={Math.max(480, (seatsPerRow || 0) * 36 + 100)}
        centered
      >
        <div style={{ padding: '24px 0', background: '#f8fafc', borderRadius: '12px', marginTop: '16px', border: '1px solid #e2e8f0' }}>
          {/* Màn hình */}
          <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto 32px', textAlign: 'center' }}>
            <div style={{ height: '6px', background: 'linear-gradient(to bottom, #e11d48, transparent)', borderRadius: '50%', boxShadow: '0 4px 10px rgba(225, 29, 72, 0.3)', marginBottom: '8px' }} />
            <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '3px', fontWeight: 800 }}>MÀN HÌNH CHIẾU</span>
          </div>

          {/* Sơ đồ ghế */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', overflowX: 'auto', padding: '0 20px' }}>
            {Array.from({ length: totalRows || 0 }).map((_, rIndex) => {
              const rowLetter = String.fromCharCode(65 + rIndex)
              const isAisleRow = parsedAisleRows.includes(rowLetter)
              return (
                <div key={rowLetter} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ width: '24px', fontWeight: 800, color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>{rowLetter}</span>
                    {Array.from({ length: seatsPerRow || 0 }).map((_, sIndex) => {
                      const seatNumber = sIndex + 1
                      const isAisle = parsedAisles.includes(seatNumber)
                      return (
                        <div key={seatNumber} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 800,
                              color: '#475569',
                              userSelect: 'none'
                            }}
                          >
                            {seatNumber}
                          </div>
                          {isAisle && (
                            <div
                              style={{
                                width: '24px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                color: '#cbd5e1',
                                fontWeight: 700,
                                userSelect: 'none'
                              }}
                            >
                              |
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <span style={{ width: '24px', fontWeight: 800, color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>{rowLetter}</span>
                  </div>
                  {isAisleRow && (
                    <div
                      style={{
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        color: '#94a3b8',
                        fontWeight: 800,
                        width: '100%',
                        borderBottom: '1px dashed #cbd5e1',
                        margin: '4px 0',
                        letterSpacing: '1px'
                      }}
                    >
                      LỐI ĐI NGANG (SAU HÀNG {rowLetter})
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ManageRoom
