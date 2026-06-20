import { useEffect, useState, useMemo } from 'react'
import {
  getSeatsByRoom,
  generateSeats,
  updateSeat,
  deleteSeat,
  createSeat,
} from '../../features/seat/seat.service'
import { getRooms } from '../../features/room/room.service'
import { getCinemas } from '../../features/cinema/cinema.service'
import type { Seat, SeatPayload } from '../../features/seat/seat.types'
import type { Room } from '../../features/room/room.types'
import type { Cinema } from '../../features/cinema/cinema.types'
import {
  Card,
  Typography,
  Space,
  Select,
  Button,
  message,
  Spin,
  Empty,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  InputNumber,
  Switch,
  Popconfirm,
  Input,
} from 'antd'
import {
  AppstoreOutlined,
  SettingOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

function ManageSeat() {
  const [cinemas, setCinemas] = useState<Cinema[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  
  const [selectedCinema, setSelectedCinema] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  
  const [currentRoomInfo, setCurrentRoomInfo] = useState<Room | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(true)
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingSeats, setIsLoadingSeats] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit')
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        const data = await getCinemas({ limit: 1000 })
        if (data && data.cinemas) {
          setCinemas(data.cinemas)
        }
      } catch {
        void message.error('Không thể tải danh sách rạp.')
      } finally {
        setIsLoadingCinemas(false)
      }
    }
    void fetchCinemas()
  }, [])

  useEffect(() => {
    if (selectedCinema) {
      const fetchRooms = async () => {
        setIsLoadingRooms(true)
        setSelectedRoom(null)
        setSeats([])
        setCurrentRoomInfo(null)
        try {
          const data = await getRooms({ cinema: selectedCinema })
          setRooms(data)
        } catch {
          void message.error('Không thể tải danh sách phòng chiếu.')
        } finally {
          setIsLoadingRooms(false)
        }
      }
      void fetchRooms()
    } else {
      setRooms([])
      setSelectedRoom(null)
      setSeats([])
      setCurrentRoomInfo(null)
    }
  }, [selectedCinema])

  const loadSeats = async (roomId: string) => {
    setIsLoadingSeats(true)
    try {
      const data = await getSeatsByRoom(roomId)
      setCurrentRoomInfo(data.room)
      setSeats(data.seats)
    } catch {
      void message.error('Không thể tải danh sách ghế.')
    } finally {
      setIsLoadingSeats(false)
    }
  }

  useEffect(() => {
    if (selectedRoom) {
      void loadSeats(selectedRoom)
    } else {
      setSeats([])
      setCurrentRoomInfo(null)
    }
  }, [selectedRoom])

  const handleGenerateSeats = async () => {
    if (!selectedRoom) return
    setIsGenerating(true)
    try {
      await generateSeats(selectedRoom)
      void message.success('Đã tạo sơ đồ ghế thành công!')
      await loadSeats(selectedRoom)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi tạo ghế.'
      void message.error(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  // Group seats by row for rendering
  const seatGrid = useMemo(() => {
    if (!seats.length) return []
    const rowsMap = new Map<string, Seat[]>()
    
    // Sort seats just in case
    const sortedSeats = [...seats].sort((a, b) => {
      if (a.row === b.row) return a.number - b.number
      return a.row.localeCompare(b.row)
    })

    sortedSeats.forEach(seat => {
      if (!rowsMap.has(seat.row)) {
        rowsMap.set(seat.row, [])
      }
      rowsMap.get(seat.row)!.push(seat)
    })

    return Array.from(rowsMap.entries())
  }, [seats])

  const getSeatColor = (seat: Seat) => {
    if (!seat.isActive) return '#d9d9d9' // Disabled/Maintenance
    switch (seat.type) {
      case 'vip': return '#fadb14' // Gold
      case 'couple': return '#ff85c0' // Pink
      case 'disabled': return '#69c0ff' // Light blue
      default: return '#95de64' // Standard Green
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingSeat(null)
    form.resetFields()
    form.setFieldsValue({
      row: '',
      quantity: 1,
      type: 'standard',
      priceMultiplier: 1,
      isActive: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (seat: Seat) => {
    setModalMode('edit')
    setEditingSeat(seat)
    form.setFieldsValue({
      type: seat.type,
      priceMultiplier: seat.priceMultiplier,
      isActive: seat.isActive,
    })
    setIsModalOpen(true)
  }

  const closeEditModal = () => {
    setIsModalOpen(false)
    setEditingSeat(null)
    form.resetFields()
  }

  const handleSaveSeat = async (values: any) => {
    if (!selectedRoom) return
    try {
      if (modalMode === 'edit') {
        if (!editingSeat) return
        await updateSeat(editingSeat._id, values)
        void message.success(`Cập nhật ghế ${editingSeat.code} thành công.`)
      } else {
        const rowUpper = values.row.toUpperCase()
        
        // Find current max number in this row to continue the sequence
        const rowSeats = seats.filter(s => s.row === rowUpper)
        let maxNumber = 0
        rowSeats.forEach(s => {
          if (s.number > maxNumber) maxNumber = s.number
        })

        const createPromises = []
        for (let i = 1; i <= values.quantity; i++) {
          const newNumber = maxNumber + i
          const code = `${rowUpper}${newNumber}`
          const payload: SeatPayload = {
            room: selectedRoom,
            row: rowUpper,
            number: newNumber,
            code,
            type: values.type,
            priceMultiplier: values.priceMultiplier,
            isActive: values.isActive,
          }
          createPromises.push(createSeat(payload))
        }

        await Promise.all(createPromises)
        void message.success(`Đã thêm ${values.quantity} ghế cho hàng ${rowUpper} thành công.`)
      }
      closeEditModal()
      await loadSeats(selectedRoom)
    } catch (err: any) {
      const msg = err.response?.data?.message || (modalMode === 'edit' ? 'Cập nhật ghế thất bại.' : 'Thêm ghế thất bại.')
      void message.error(msg)
    }
  }

  const handleDeleteSeat = async () => {
    if (!editingSeat || !selectedRoom) return
    try {
      await deleteSeat(editingSeat._id)
      void message.success(`Đã xóa ghế ${editingSeat.code}.`)
      closeEditModal()
      await loadSeats(selectedRoom)
    } catch {
      void message.error('Xóa ghế thất bại.')
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* Top Control Panel */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <SettingOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                Quản Lý Sơ Đồ Ghế
              </Title>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>Chọn Rạp Chiếu:</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Vui lòng chọn rạp..."
                options={cinemas.map(c => ({ label: c.name, value: c._id }))}
                value={selectedCinema}
                onChange={(val) => setSelectedCinema(val)}
                loading={isLoadingCinemas}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>Chọn Phòng Chiếu:</div>
              <Select
                style={{ width: '100%' }}
                placeholder={selectedCinema ? "Vui lòng chọn phòng..." : "Hãy chọn rạp trước"}
                options={rooms.map(r => ({ label: `${r.name} (${r.roomType})`, value: r._id }))}
                value={selectedRoom}
                onChange={(val) => setSelectedRoom(val)}
                loading={isLoadingRooms}
                disabled={!selectedCinema}
                showSearch
                optionFilterProp="label"
              />
            </Col>
          </Row>
        </Card>

        {/* Seat Map Area */}
        {selectedRoom && (
          <Card
            bordered={false}
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
            title={
              <Space>
                <AppstoreOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
                <Title level={4} style={{ margin: 0 }}>
                  Sơ Đồ Ghế: {currentRoomInfo?.name || 'Đang tải...'}
                </Title>
              </Space>
            }
            extra={
              seats.length > 0 && (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                  Thêm Ghế
                </Button>
              )
            }
          >
            {isLoadingSeats ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
              </div>
            ) : seats.length === 0 ? (
              <Empty
                description={<span style={{ color: '#8c8c8c' }}>Phòng này chưa có ghế nào được thiết lập.</span>}
                style={{ margin: '40px 0' }}
              >
                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleGenerateSeats}
                  loading={isGenerating}
                >
                  Tự Động Tạo Sơ Đồ Ghế (Dựa trên cấu hình phòng)
                </Button>
              </Empty>
            ) : (
              <div>
                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#95de64', borderRadius: 4 }}/> Standard</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#fadb14', borderRadius: 4 }}/> VIP</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#ff85c0', borderRadius: 4 }}/> Couple</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#69c0ff', borderRadius: 4 }}/> Disabled</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#d9d9d9', borderRadius: 4 }}/> Bảo trì (Ẩn)</Space>
                </div>

                {/* Screen */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <div style={{ 
                    height: '8px', 
                    background: 'linear-gradient(90deg, transparent, #8c8c8c, transparent)', 
                    width: '80%', 
                    margin: '0 auto 12px auto',
                    borderRadius: '4px'
                  }}></div>
                  <Text type="secondary" strong>MÀN HÌNH</Text>
                </div>

                {/* Grid */}
                <div style={{ overflowX: 'auto', paddingBottom: '24px' }}>
                  <div style={{ minWidth: 'min-content', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    {seatGrid.map(([rowName, rowSeats]) => (
                      <div key={rowName} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', textAlign: 'center', fontWeight: 'bold', color: '#595959' }}>
                          {rowName}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {rowSeats.map((seat) => (
                            <div
                              key={seat._id}
                              onClick={() => openEditModal(seat)}
                              style={{
                                width: seat.type === 'couple' ? '70px' : '32px',
                                height: '32px',
                                backgroundColor: getSeatColor(seat),
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: seat.isActive ? '#000' : '#8c8c8c',
                                fontWeight: 600,
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '1px solid rgba(0,0,0,0.1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              }}
                              title={`Ghế ${seat.code} - ${seat.type}`}
                            >
                              {seat.number}
                            </div>
                          ))}
                        </div>
                        <div style={{ width: '30px', textAlign: 'center', fontWeight: 'bold', color: '#595959' }}>
                          {rowName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </Space>

      {/* Edit/Create Seat Modal */}
      <Modal
        title={modalMode === 'edit' ? `Chỉnh sửa ghế: ${editingSeat?.code}` : 'Thêm ghế mới'}
        open={isModalOpen}
        onCancel={closeEditModal}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveSeat}
          initialValues={{
            type: 'standard',
            priceMultiplier: 1,
            isActive: true,
          }}
        >
          {modalMode === 'create' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Hàng ghế (vd: A)" name="row" rules={[{ required: true, message: 'Vui lòng nhập hàng!' }]}>
                  <Input maxLength={2} style={{ textTransform: 'uppercase' }} placeholder="Nhập chữ, vd: A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Số lượng ghế cần thêm" name="quantity" rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}>
                  <InputNumber min={1} max={50} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item label="Loại ghế" name="type">
            <Select>
              <Select.Option value="standard">Standard (Tiêu chuẩn)</Select.Option>
              <Select.Option value="vip">VIP</Select.Option>
              <Select.Option value="couple">Couple (Ghế đôi)</Select.Option>
              <Select.Option value="disabled">Disabled (Dành cho người khuyết tật)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Hệ số giá (Price Multiplier)" name="priceMultiplier" help="1 = Giá cơ bản, 1.5 = Đắt hơn 50%">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Bảo trì" />
          </Form.Item>

          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col span={modalMode === 'edit' ? 12 : 0}>
              {modalMode === 'edit' && (
                <Popconfirm
                  title="Xóa ghế này?"
                  onConfirm={handleDeleteSeat}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger block icon={<DeleteOutlined />}>Xóa ghế</Button>
                </Popconfirm>
              )}
            </Col>
            <Col span={modalMode === 'edit' ? 12 : 24}>
              <Button type="primary" htmlType="submit" block icon={<SaveOutlined />}>
                Lưu thay đổi
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default ManageSeat
