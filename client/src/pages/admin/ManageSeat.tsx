import { useEffect, useState, useMemo } from 'react'
import {
  getSeatsByRoom,
  generateSeats,
  updateSeat,
  deleteSeat,
  createSeat,
  mergeCoupleSeats,
} from '../../features/seat/seat.service'
import { getRooms } from '../../features/room/room.service'
import type { Seat, SeatPayload } from '../../features/seat/seat.types'
import type { Room } from '../../features/room/room.types'
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
  const [rooms, setRooms] = useState<Room[]>([])

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  const [currentRoomInfo, setCurrentRoomInfo] = useState<Room | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])

  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingSeats, setIsLoadingSeats] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'mass_edit'>('edit')
  const [form] = Form.useForm()

  // Mass Select State
  const [isMassSelectMode, setIsMassSelectMode] = useState(false)
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoadingRooms(true)
      try {
        const data = await getRooms()
        setRooms(data)
      } catch {
        void message.error('Không thể tải danh sách phòng chiếu.')
      } finally {
        setIsLoadingRooms(false)
      }
    }
    void fetchRooms()
  }, [])

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

  const openMassEditModal = () => {
    setModalMode('mass_edit')
    form.resetFields()
    form.setFieldsValue({
      type: undefined,
      priceMultiplier: undefined,
      isActive: undefined
    })
    setIsModalOpen(true)
  }

  const handleSeatClick = (seat: Seat) => {
    if (isMassSelectMode) {
      if (selectedSeatIds.includes(seat._id)) {
        setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat._id))
      } else {
        setSelectedSeatIds([...selectedSeatIds, seat._id])
      }
    } else {
      openEditModal(seat)
    }
  }

  const closeEditModal = () => {
    setIsModalOpen(false)
    setEditingSeat(null)
    form.resetFields()
  }

  const handleSaveSeat = async (values: any) => {
    if (!selectedRoom) return
    try {
      if (modalMode === 'mass_edit') {
        const createPromises = selectedSeatIds.map(id => {
          const payload: any = {};
          if (values.type !== undefined) payload.type = values.type;
          if (values.priceMultiplier !== undefined && values.priceMultiplier !== null) payload.priceMultiplier = values.priceMultiplier;
          if (values.isActive !== undefined) payload.isActive = values.isActive;
          return updateSeat(id, payload);
        });
        await Promise.all(createPromises)
        void message.success(`Cập nhật thành công ${selectedSeatIds.length} ghế.`)
        setSelectedSeatIds([])
        setIsMassSelectMode(false)
      } else if (modalMode === 'edit') {
        if (!editingSeat) return
        await updateSeat(editingSeat._id, values)
        void message.success(`Cập nhật ghế ${editingSeat.code} thành công.`)
      } else {
        const rowUpper = values.row.toUpperCase()

        const rowSeats = seats.filter(s => s.row === rowUpper)
        const takenNumbers = new Set<number>()
        rowSeats.forEach(s => {
          takenNumbers.add(s.number)
          if (s.type === 'couple') {
            takenNumbers.add(s.number + 1)
          }
        })

        let maxNumber = 0
        takenNumbers.forEach(num => {
          if (num > maxNumber) maxNumber = num
        })

        const availableGaps: number[] = []
        for (let i = 1; i <= maxNumber; i++) {
          if (!takenNumbers.has(i)) availableGaps.push(i)
        }

        const qty = Number(values.quantity) || 0
        const appendCount = Math.max(0, qty - availableGaps.length)
        const newMaxNumber = maxNumber + appendCount

        if (newMaxNumber > 20) {
          void message.error(`Hàng ${rowUpper} không thể thêm đủ ${qty} ghế vì vượt quá giới hạn 20 ghế (hiện trống ${availableGaps.length} chỗ, và có thể thêm tối đa ${20 - maxNumber} ghế vào cuối hàng).`)
          return
        }

        const createPromises = []
        let gapIndex = 0
        let nextAppendNumber = maxNumber + 1

        for (let i = 0; i < qty; i++) {
          let newNumber: number;
          if (gapIndex < availableGaps.length) {
            newNumber = availableGaps[gapIndex++]
          } else {
            newNumber = nextAppendNumber++
          }

          const code = `${rowUpper}${newNumber}`
          const payload: SeatPayload = {
            room: selectedRoom,
            row: rowUpper,
            number: newNumber,
            code,
            type: values.type || 'standard',
            priceMultiplier: values.priceMultiplier || 1,
            isActive: values.isActive ?? true,
          }
          createPromises.push(createSeat(payload))
        }

        await Promise.all(createPromises)
        void message.success(`Đã thêm ${qty} ghế cho hàng ${rowUpper} thành công.`)
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Xóa ghế thất bại.'
      void message.error(msg)
    }
  }

  const handleMassDeleteSeat = async () => {
    if (selectedSeatIds.length === 0 || !selectedRoom) return
    setIsGenerating(true)
    try {
      const results = await Promise.allSettled(selectedSeatIds.map(id => deleteSeat(id)))

      const fulfilled = results.filter(r => r.status === 'fulfilled')
      const rejected = results.filter(r => r.status === 'rejected')

      if (fulfilled.length > 0) {
        void message.success(`Đã xóa thành công ${fulfilled.length} ghế.`)
      }
      if (rejected.length > 0) {
        void message.error(`Có ${rejected.length} ghế không thể xóa (có thể đã có người đặt).`)
      }

      setSelectedSeatIds([])
      setIsMassSelectMode(false)
      await loadSeats(selectedRoom)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMergeCouple = async () => {
    if (selectedSeatIds.length === 0 || selectedSeatIds.length % 2 !== 0 || !selectedRoom) return
    setIsGenerating(true)
    try {
      const selectedSeats = seats.filter(s => selectedSeatIds.includes(s._id))
      
      const hasCouple = selectedSeats.some(s => s.type === 'couple')
      if (hasCouple) {
        void message.error('Không thể ghép các ghế đã là ghế đôi (Couple). Vui lòng chỉ chọn ghế đơn.')
        setIsGenerating(false)
        return
      }

      // Sort seats by row and number
      selectedSeats.sort((a, b) => {
        if (a.row === b.row) return a.number - b.number
        return a.row.localeCompare(b.row)
      })

      // Check for aisle crossing
      let crossesAisle = false;
      const parsedAisles = currentRoomInfo?.aisleColumns || [];
      for (let i = 0; i < selectedSeats.length; i += 2) {
        const firstSeat = selectedSeats[i];
        if (parsedAisles.includes(firstSeat.number)) {
          crossesAisle = true;
          break;
        }
      }

      if (crossesAisle) {
        void message.error('Không thể ghép 2 ghế nằm ở 2 bên lối đi.')
        setIsGenerating(false)
        return
      }

      const promises = []
      for (let i = 0; i < selectedSeats.length; i += 2) {
        promises.push(mergeCoupleSeats(selectedSeats[i]._id, selectedSeats[i + 1]._id))
      }

      await Promise.all(promises)
      void message.success(`Đã ghép ${selectedSeats.length / 2} cặp ghế thành Couple thành công.`)
      setSelectedSeatIds([])
      setIsMassSelectMode(false)
      await loadSeats(selectedRoom)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ghép ghế thất bại.'
      void message.error(msg)
    } finally {
      setIsGenerating(false)
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
            <Col xs={24}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>Chọn Phòng Chiếu:</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Vui lòng chọn phòng..."
                options={rooms.map(r => {
                  let typeName: string = r.roomType;
                  if (r.roomType === '2D') typeName = 'Tiêu chuẩn';
                  if (r.roomType === 'VIP') typeName = 'VIP';
                  if (r.roomType === 'IMAX') typeName = 'IMAX';
                  return { label: `${r.name} (${typeName})`, value: r._id };
                })}
                value={selectedRoom}
                onChange={(val) => setSelectedRoom(val)}
                loading={isLoadingRooms}
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
                <Space size="middle">
                  <Switch
                    checked={isMassSelectMode}
                    onChange={(checked) => {
                      setIsMassSelectMode(checked)
                      setSelectedSeatIds([])
                    }}
                    checkedChildren="Tắt chọn nhiều"
                    unCheckedChildren="Bật chọn nhiều"
                  />
                  {isMassSelectMode && selectedSeatIds.length > 0 && (
                    <Space>
                      {selectedSeatIds.length > 0 && selectedSeatIds.length % 2 === 0 && (
                        <Popconfirm
                          title={`Ghép ${selectedSeatIds.length / 2} cặp ghế thành Couple?`}
                          description="Các ghế trong mỗi cặp phải nằm liền kề nhau."
                          onConfirm={handleMergeCouple}
                          okText="Ghép"
                          cancelText="Hủy"
                        >
                          <Button style={{ borderColor: '#ff85c0', color: '#ff85c0' }} loading={isGenerating}>
                            Ghép thành Couple
                          </Button>
                        </Popconfirm>
                      )}
                      <Button onClick={openMassEditModal}>
                        Sửa {selectedSeatIds.length} ghế
                      </Button>
                      <Popconfirm
                        title={`Xóa ${selectedSeatIds.length} ghế?`}
                        description="Hành động này không thể hoàn tác."
                        onConfirm={handleMassDeleteSeat}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button danger loading={isGenerating}>
                          Xóa
                        </Button>
                      </Popconfirm>
                    </Space>
                  )}
                  {!isMassSelectMode && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                      Thêm Ghế
                    </Button>
                  )}
                </Space>
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
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#95de64', borderRadius: 4 }} /> Standard</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#fadb14', borderRadius: 4 }} /> VIP</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#ff85c0', borderRadius: 4 }} /> Couple</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#69c0ff', borderRadius: 4 }} /> Disabled</Space>
                  <Space><div style={{ width: 16, height: 16, backgroundColor: '#d9d9d9', borderRadius: 4 }} /> Bảo trì (Ẩn)</Space>
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
                  <div style={{ width: 'max-content', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    {seatGrid.map(([rowName, rowSeats]) => {
                      const parsedAisles = currentRoomInfo?.aisleColumns || []
                      const parsedAisleRows = currentRoomInfo?.aisleRows || []
                      const isAisleRow = parsedAisleRows.includes(rowName.toUpperCase())

                      return (
                        <div key={rowName} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '30px', textAlign: 'center', fontWeight: 'bold', color: '#595959' }}>
                              {rowName}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {(() => {
                                const maxSeatNum = Math.max(...rowSeats.map(s => s.number), 0);
                                const elements = [];
                                let currentCol = 1;
                                for (let num = 1; num <= maxSeatNum; num++) {
                                  const seat = rowSeats.find(s => s.number === num);
                                  if (seat) {
                                    const isCouple = seat.type === 'couple';
                                    const colsOccupied = isCouple ? 2 : 1;
                                    const seatPhysicalCols = Array.from({ length: colsOccupied }, (_, i) => currentCol + i);
                                    const isAisle = parsedAisles.some(a => seatPhysicalCols.includes(a));

                                    elements.push(
                                      <div key={seat._id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div
                                          onClick={() => handleSeatClick(seat)}
                                          style={{
                                            width: isCouple ? '72px' : '32px',
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
                                            border: selectedSeatIds.includes(seat._id) ? '2px solid #1890ff' : '1px solid rgba(0,0,0,0.1)',
                                            boxShadow: selectedSeatIds.includes(seat._id) ? '0 0 8px rgba(24,144,255,0.6)' : '0 2px 4px rgba(0,0,0,0.05)',
                                            overflow: 'hidden',
                                            transform: selectedSeatIds.includes(seat._id) ? 'scale(1.1)' : 'none',
                                            zIndex: selectedSeatIds.includes(seat._id) ? 10 : 1
                                          }}
                                          title={`Ghế ${seat.code} - ${seat.type}`}
                                        >
                                          {isCouple ? `${seat.number}   -  ${seat.number + 1}` : seat.number}
                                        </div>
                                        {isAisle && (
                                          <div
                                            style={{
                                              width: '24px',
                                              height: '32px',
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
                                    );
                                    currentCol += colsOccupied;
                                    if (isCouple) num++; // couple takes two seat numbers
                                  } else {
                                    // Missing seat gap
                                    const isAisle = parsedAisles.includes(currentCol);
                                    elements.push(
                                      <div key={`gap-${num}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div style={{ width: '32px', height: '32px' }} />
                                        {isAisle && (
                                          <div
                                            style={{
                                              width: '24px',
                                              height: '32px',
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
                                    );
                                    currentCol += 1;
                                  }
                                }
                                return elements;
                              })()}
                            </div>
                            <div style={{ width: '30px', textAlign: 'center', fontWeight: 'bold', color: '#595959' }}>
                              {rowName}
                            </div>
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
                              LỐI ĐI NGANG (SAU HÀNG {rowName})
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </Space>

      {/* Edit/Create Seat Modal */}
      <Modal
        title={modalMode === 'edit' ? `Chỉnh sửa ghế: ${editingSeat?.code}` : modalMode === 'mass_edit' ? `Sửa hàng loạt ${selectedSeatIds.length} ghế` : 'Thêm ghế mới'}
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
                <Form.Item
                  label="Hàng ghế (vd: A)"
                  name="row"
                  rules={[
                    { required: true, message: 'Vui lòng nhập hàng!' },
                    { pattern: /^[A-Oa-o]$/, message: 'Chỉ được nhập từ A đến O!' }
                  ]}
                  help="Từ A đến O"
                >
                  <Input maxLength={1} style={{ textTransform: 'uppercase' }} placeholder="Nhập chữ, vd: A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Số lượng ghế cần thêm"
                  name="quantity"
                  rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
                  help="Tối đa 20 ghế mỗi hàng"
                >
                  <InputNumber min={1} max={20} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item label="Loại ghế" name="type">
            <Select placeholder="Giữ nguyên" allowClear onChange={(val) => {
              if (val === 'vip') {
                form.setFieldValue('priceMultiplier', 1.1)
              } else if (val === 'standard' || val === 'disabled') {
                form.setFieldValue('priceMultiplier', 1)
              } else if (val === 'couple') {
                form.setFieldValue('priceMultiplier', 2)
              }
            }}>
              <Select.Option value="standard">Standard (Tiêu chuẩn)</Select.Option>
              <Select.Option value="vip">VIP</Select.Option>
              {modalMode !== 'create' && <Select.Option value="couple">Couple (Ghế đôi)</Select.Option>}
              <Select.Option value="disabled">Disabled (Dành cho người khuyết tật)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Hệ số giá (Price Multiplier)" name="priceMultiplier" help="1 = Giá cơ bản, 1.5 = Đắt hơn 50%">
            <InputNumber placeholder="Giữ nguyên" min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Trạng thái" name="isActive" valuePropName={modalMode === 'mass_edit' ? 'value' : 'checked'}>
            {modalMode === 'mass_edit' ? (
              <Select placeholder="Giữ nguyên" allowClear>
                <Select.Option value={true}>Hoạt động</Select.Option>
                <Select.Option value={false}>Bảo trì</Select.Option>
              </Select>
            ) : (
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Bảo trì" />
            )}
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
                {modalMode === 'mass_edit' ? 'Lưu hàng loạt' : 'Lưu thay đổi'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default ManageSeat
