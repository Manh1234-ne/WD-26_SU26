import React, { useState, useEffect } from 'react'
import {
    Modal,
    Form,
    Select,
    Input,
    InputNumber,
    DatePicker,
    TimePicker,
    Button,
    Table,
    Space,
    Tag,
    Typography,
    Row,
    Col,
    message,
    Divider
} from 'antd'
import { useForm, Controller } from 'react-hook-form'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'



import type { Movie } from '../../features/movie/movie.types'
import type { Room } from '../../features/room/room.types'
import type { Showtime } from '../../features/showtime/showtime.type'
import { createShowtime } from '../../features/showtime/showtime.service'
import { CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

const { Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface MassCreateShowtimeModalProps {
    isOpen: boolean
    onClose: () => void
    movies: Movie[]
    rooms: Room[]
    existingShowtimes: Showtime[]
    onSuccess: () => void
}

interface MassCreateFormValues {
    movieId: string
    roomId: string
    dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null
    timeSlots: dayjs.Dayjs[]
    format: string
    language: string
    subtitle: string
    basePrice: number
}

interface PreviewItem {
    id: string
    date: string
    startTime: string
    endTime: string
    startObj: Date
    endObj: Date
    isOverlap: boolean
}

export const MassCreateShowtimeModal: React.FC<MassCreateShowtimeModalProps> = ({
    isOpen,
    onClose,
    movies,
    rooms,
    existingShowtimes,
    onSuccess
}) => {
    const { control, handleSubmit, watch, setValue, getValues, reset } = useForm<MassCreateFormValues>({
        defaultValues: {
            dateRange: null,
            timeSlots: [],
            format: '2D',
            language: 'Tiếng Việt',
            subtitle: '',
            basePrice: 90000
        }
    })

    const [previewList, setPreviewList] = useState<PreviewItem[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const selectedMovieId = watch('movieId')
    const selectedRoomId = watch('roomId')
    const selectedMovie = movies.find((m) => m._id === selectedMovieId)
    const selectedRoom = rooms.find((r) => r._id === selectedRoomId)
    const movieDuration = (selectedMovie as Movie & { duration?: number })?.duration

    // Handle available formats
    let availableFormats: string[] = []
    const movieFormats = selectedMovie?.formats && selectedMovie.formats.length > 0
        ? selectedMovie.formats
        : ['2D']

    if (selectedRoom) {
        if (selectedRoom.roomType === 'IMAX') {
            availableFormats = movieFormats.includes('IMAX') ? ['IMAX'] : []
        } else {
            availableFormats = movieFormats.filter(f => f === '2D' || f === '3D')
        }
    } else {
        availableFormats = movieFormats
    }

    const availableFormatsStr = availableFormats.join(',')

    useEffect(() => {
        const formatsArray = availableFormatsStr ? availableFormatsStr.split(',') : []
        const currentFormat = getValues('format')
        if (formatsArray.length > 0 && !formatsArray.includes(currentFormat)) {
            setValue('format', formatsArray[0])
        } else if (formatsArray.length === 0) {
            setValue('format', '')
        }
    }, [availableFormatsStr, setValue, getValues])

    const handlePreview = (data: MassCreateFormValues) => {
        if (!data.dateRange || !data.dateRange[0] || !data.dateRange[1]) {
            message.error('Vui lòng chọn khoảng thời gian')
            return
        }
        if (!data.timeSlots || data.timeSlots.length === 0) {
            message.error('Vui lòng chọn ít nhất 1 khung giờ')
            return
        }
        if (!selectedMovie) {
            message.error('Vui lòng chọn phim')
            return
        }
        if (!selectedRoom) {
            message.error('Vui lòng chọn phòng chiếu')
            return
        }

        setIsGenerating(true)
        const duration = (selectedMovie as Movie & { duration?: number })?.duration
        if (!duration) {
            message.error('Phim chưa có thời lượng')
            setIsGenerating(false)
            return
        }

        const [startDay, endDay] = data.dateRange
        const newPreviewList: PreviewItem[] = []
        let currentDay = startDay.startOf('day')

        while (currentDay.isSameOrBefore(endDay.startOf('day'))) {
            for (const timeSlot of data.timeSlots) {
                const hour = timeSlot.hour()
                const minute = timeSlot.minute()

                const startObj = currentDay.hour(hour).minute(minute).second(0).toDate()
                // endTime = startTime + duration + 20 mins
                const endObj = new Date(startObj.getTime() + (Number(duration) + 20) * 60 * 1000)

                // Check overlap with existing showtimes
                const isOverlap = existingShowtimes.some(existing => {
                    const exRoomId = typeof existing.room === 'object' ? (existing.room as any)._id : existing.room;
                    if (exRoomId !== data.roomId) return false;
                    if ((existing as any).status === 'cancelled') return false;

                    const exStart = new Date(existing.startTime)
                    const exEnd = new Date(existing.endTime)

                    // overlap condition: start < exEnd AND end > exStart
                    return startObj < exEnd && endObj > exStart
                })

                newPreviewList.push({
                    id: `${currentDay.format('YYYY-MM-DD')}-${hour}-${minute}`,
                    date: currentDay.format('DD/MM/YYYY'),
                    startTime: dayjs(startObj).format('HH:mm'),
                    endTime: dayjs(endObj).format('HH:mm'),
                    startObj,
                    endObj,
                    isOverlap
                })
            }
            currentDay = currentDay.add(1, 'day')
        }

        // Check internal overlaps within the new list
        for (let i = 0; i < newPreviewList.length; i++) {
            for (let j = i + 1; j < newPreviewList.length; j++) {
                const item1 = newPreviewList[i]
                const item2 = newPreviewList[j]
                if (item1.startObj < item2.endObj && item1.endObj > item2.startObj) {
                    item1.isOverlap = true
                    item2.isOverlap = true
                }
            }
        }

        setPreviewList(newPreviewList)
        setShowPreview(true)
        setIsGenerating(false)
    }

    const handleConfirmCreate = async () => {
        const data = getValues()
        const validItems = previewList.filter(item => !item.isOverlap)

        if (validItems.length === 0) {
            message.warning('Không có suất chiếu nào hợp lệ để tạo')
            return
        }

        setIsCreating(true)
        let successCount = 0
        let failCount = 0

        for (const item of validItems) {
            try {
                await createShowtime({
                    movie: data.movieId,
                    room: data.roomId,
                    startTime: item.startObj,
                    endTime: item.endObj,
                    format: data.format,
                    language: data.language,
                    subtitle: data.subtitle,
                    basePrice: data.basePrice,
                    status: 'open'
                })
                successCount++
            } catch (error) {
                console.error(error)
                failCount++
            }
        }

        setIsCreating(false)
        if (successCount > 0) {
            message.success(`Đã tạo thành công ${successCount} suất chiếu`)
        }
        if (failCount > 0) {
            message.error(`Có ${failCount} suất chiếu tạo thất bại`)
        }

        if (successCount > 0) {
            reset()
            setShowPreview(false)
            onSuccess()
            onClose()
        }
    }

    const handleRemovePreviewItem = (idToRemove: string) => {
        setPreviewList(prev => prev.filter(item => item.id !== idToRemove))
    }

    const columns = [
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
            render: (text: string) => <Tag icon={<CalendarOutlined />} color="blue">{text}</Tag>
        },
        {
            title: 'Bắt đầu',
            dataIndex: 'startTime',
            key: 'startTime',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Kết thúc',
            dataIndex: 'endTime',
            key: 'endTime',
            render: (text: string) => <Text type="secondary">{text}</Text>
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (_: any, record: PreviewItem) => (
                record.isOverlap ? (
                    <Tag icon={<CloseCircleOutlined />} color="error">Trùng lịch</Tag>
                ) : (
                    <Tag icon={<CheckCircleOutlined />} color="success">Hợp lệ</Tag>
                )
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: PreviewItem) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemovePreviewItem(record.id)}
                    title="Xóa suất chiếu này"
                />
            )
        }
    ]

    return (
        <Modal
            title="Tạo Hàng Loạt Suất Chiếu"
            open={isOpen}
            onCancel={onClose}
            width={900}
            footer={null}
            destroyOnClose
        >
            <div style={{ display: showPreview ? 'none' : 'block' }}>
                <Form layout="vertical" onFinish={handleSubmit(handlePreview)}>
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Form.Item label="Chọn Phim" required>
                                <Controller
                                    name="movieId"
                                    control={control}
                                    rules={{ required: 'Vui lòng chọn phim' }}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            showSearch
                                            optionFilterProp="label"
                                            placeholder="-- Chọn phim --"
                                            options={movies.map(m => ({ label: m.title, value: m._id }))}
                                        />
                                    )}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Chọn Phòng" required>
                                <Controller
                                    name="roomId"
                                    control={control}
                                    rules={{ required: 'Vui lòng chọn phòng' }}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            showSearch
                                            optionFilterProp="label"
                                            placeholder="-- Chọn phòng --"
                                            options={rooms.map(r => {
                                                let typeName: string = r.roomType
                                                if (r.roomType === '2D') typeName = 'Tiêu chuẩn'
                                                if (r.roomType === 'VIP') typeName = 'VIP'
                                                if (r.roomType === 'IMAX') typeName = 'IMAX'
                                                return { label: `${r.name} - ${typeName}`, value: r._id }
                                            })}
                                        />
                                    )}
                                />
                            </Form.Item>
                        </Col>
                        {movieDuration && (
                            <Col span={24}>
                                <div style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#1d4ed8',
                                    marginBottom: '16px'
                                }}>
                                    <ClockCircleOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                        Thời lượng phim: <strong style={{ color: '#1e40af', fontSize: '14px' }}>{movieDuration} phút</strong> + <strong style={{ color: '#059669', fontSize: '14px' }}>20 phút Quãng Nghỉ</strong>
                                    </span>
                                </div>
                            </Col>
                        )}
                        <Col span={8}>
                            <Form.Item label="Định dạng" required>
                                <Controller
                                    name="format"
                                    control={control}
                                    rules={{ required: 'Vui lòng chọn định dạng' }}
                                    render={({ field }) => (
                                        <Select {...field} placeholder="Định dạng">
                                            {availableFormats.length === 0 ? (
                                                <Option value="" disabled>Không có định dạng phù hợp</Option>
                                            ) : (
                                                availableFormats.map((f) => (
                                                    <Option key={f} value={f}>{f}</Option>
                                                ))
                                            )}
                                        </Select>
                                    )}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Ngôn ngữ" required>
                                <Controller
                                    name="language"
                                    control={control}
                                    rules={{ required: 'Bắt buộc' }}
                                    render={({ field }) => <Input {...field} />}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Giá vé gốc" required>
                                <Controller
                                    name="basePrice"
                                    control={control}
                                    rules={{ required: 'Bắt buộc', min: 0 }}
                                    render={({ field }) => (
                                        <Space.Compact style={{ width: '100%' }}>
                                            <InputNumber
                                                {...field}
                                                style={{ width: '100%' }}
                                                min={0}
                                                step={5000}
                                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            />
                                            <Button style={{ backgroundColor: '#fafafa', cursor: 'default' }}>VNĐ</Button>
                                        </Space.Compact>
                                    )}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ margin: '24px 0 16px', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                        <Text strong style={{ fontSize: 16 }}>Thiết lập thời gian</Text>
                    </div>

                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <Form.Item label="Khoảng ngày chiếu" required>
                                <Controller
                                    name="dateRange"
                                    control={control}
                                    rules={{ required: 'Bắt buộc' }}
                                    render={({ field }) => (
                                        <RangePicker
                                            {...field}
                                            style={{ width: '100%' }}
                                            format="DD/MM/YYYY"
                                        />
                                    )}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Các khung giờ trong ngày" required>
                                <Controller
                                    name="timeSlots"
                                    control={control}
                                    rules={{ required: 'Chọn ít nhất 1 khung giờ' }}
                                    render={({ field }) => (
                                        <TimePicker
                                            value={null}
                                            format="HH:mm"
                                            onChange={(val) => {
                                                if (val) {
                                                    field.onChange([...field.value, val])
                                                }
                                            }}
                                            placeholder="Thêm giờ chiếu"
                                            showNow={false}
                                            allowClear={false}
                                            renderExtraFooter={() => (
                                                <div style={{ padding: 10 }}>
                                                    Mẹo: Chọn một giờ để tự động thêm vào danh sách
                                                </div>
                                            )}
                                        />
                                    )}
                                />
                                <div style={{ marginTop: 10 }}>
                                    <Controller
                                        name="timeSlots"
                                        control={control}
                                        render={({ field }) => (
                                            <Space wrap>
                                                {field.value.map((time, index) => (
                                                    <Tag
                                                        key={index}
                                                        closable
                                                        onClose={() => {
                                                            const newTimes = [...field.value]
                                                            newTimes.splice(index, 1)
                                                            field.onChange(newTimes)
                                                        }}
                                                        color="geekblue"
                                                    >
                                                        {time.format('HH:mm')}
                                                    </Tag>
                                                ))}
                                            </Space>
                                        )}
                                    />
                                </div>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                        <Space>
                            <Button onClick={onClose}>Hủy</Button>
                            <Button type="primary" htmlType="submit" loading={isGenerating}>
                                Xem trước
                            </Button>
                        </Space>
                    </div>
                </Form>
            </div>

            {showPreview && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ fontSize: 16 }}>Danh sách suất chiếu dự kiến</Text>
                        <br />
                        <Text type="secondary">
                            Tổng cộng: {previewList.length} suất chiếu
                            ({previewList.filter(i => !i.isOverlap).length} hợp lệ, {previewList.filter(i => i.isOverlap).length} trùng lịch)
                        </Text>
                    </div>
                    <Table
                        dataSource={previewList}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                        <Space>
                            <Button onClick={() => setShowPreview(false)}>Quay lại chỉnh sửa</Button>
                            <Button
                                type="primary"
                                onClick={handleConfirmCreate}
                                loading={isCreating}
                                disabled={previewList.filter(i => !i.isOverlap).length === 0}
                            >
                                Xác nhận tạo ({previewList.filter(i => !i.isOverlap).length})
                            </Button>
                        </Space>
                    </div>
                </div>
            )}
        </Modal>
    )
}
