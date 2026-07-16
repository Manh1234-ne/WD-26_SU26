import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

import { getMovies } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

import { createShowtime, deleteShowtime, getAllShowtimes, updateShowtime } from '../../features/showtime/showtime.service'
import type { Showtime } from '../../features/showtime/showtime.type'
import { getRooms } from '../../features/room/room.service'
import type { Room } from '../../features/room/room.types'
import { api } from '../../services/api'
import { getSeatsByRoom } from '../../features/seat/seat.service'

interface Seat {
    _id: string
    code: string
    row: string
    number: number
    type: 'standard' | 'vip' | 'couple' | 'disabled'
    priceMultiplier: number
    isActive: boolean
}

import {
    Card,
    Form,
    Select,
    InputNumber,
    Input,
    Button,
    Table,
    Space,
    Tag,
    Typography,
    Row,
    Col,
    Switch,
    DatePicker,
    message,
    Divider,
    Alert,
    Popconfirm,
    Modal,
    Tooltip,
} from 'antd'
import {
    CalendarOutlined,
    PlusOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    EditOutlined,
    CloseOutlined,
    DeleteOutlined,
    EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const FORMAT_OPTIONS = ['2D', '3D', 'IMAX', '4DX', 'ScreenX']

interface ShowtimePayload {
    movieId: string
    roomId: string
    startTime: string
    endTime: string
    format: string
    language: string
    subtitle: string
    basePrice: number
    status: boolean
}

function formatDateTime(date: Date | string) {
    return dayjs(date).format('DD/MM/YYYY HH:mm')
}

function formatPrice(price: number) {
    return price.toLocaleString('vi-VN') + 'đ'
}

function ManageShowtime() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [showtimes, setShowtimes] = useState<Showtime[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // States for viewing seats
    const [viewingShowtime, setViewingShowtime] = useState<Showtime | null>(null)
    const [seats, setSeats] = useState<Seat[]>([])
    const [occupiedSeatIds, setOccupiedSeatIds] = useState<Set<string>>(new Set())
    const [isLoadingSeats, setIsLoadingSeats] = useState(false)

    const handleViewSeats = async (showtime: Showtime) => {
        setViewingShowtime(showtime)
        setIsLoadingSeats(true)
        setSeats([])
        setOccupiedSeatIds(new Set())
        try {
            const seatRes = await getSeatsByRoom(showtime.room._id)
            const seatsList = seatRes?.seats || []
            setSeats(seatsList)

            const occupiedRes = await api.get(`/booking-seats/showtime/${showtime._id}/occupied`)
            const occupiedData = occupiedRes.data?.data || []
            const occupiedIds = new Set<string>(occupiedData.map((os: any) => os.seat?._id || os.seat))
            setOccupiedSeatIds(occupiedIds)
        } catch (error) {
            console.error(error)
            void message.error('Không thể tải sơ đồ ghế cho lịch chiếu này')
        } finally {
            setIsLoadingSeats(false)
        }
    }
    const [isSaving, setIsSaving] = useState(false)

    const {
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors },
    } = useForm<ShowtimePayload>({
        defaultValues: {
            movieId: '',
            roomId: '',
            startTime: '',
            endTime: '',
            format: '2D',
            language: 'Tiếng Việt',
            subtitle: '',
            basePrice: 90000,
            status: true,
        },
    })

    const selectedMovieId = watch('movieId')
    const startTimeValue = watch('startTime')

    useEffect(() => {
        if (!selectedMovieId || !startTimeValue) return
        const movie = movies.find((m) => m._id === selectedMovieId)
        const duration = (movie as Movie & { duration?: number })?.duration
        if (!duration) return

        const start = new Date(startTimeValue)
        if (isNaN(start.getTime())) return

        const end = new Date(start.getTime() + duration * 60 * 1000)
        const pad = (n: number) => String(n).padStart(2, '0')
        const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
        setValue('endTime', endStr)
    }, [selectedMovieId, startTimeValue, movies, setValue])

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [moviesData, roomsData, showtimesData] = await Promise.all([
                    getMovies(),
                    getRooms(),
                    getAllShowtimes(),
                ])
                setMovies(moviesData)
                setRooms(roomsData)
                setShowtimes(showtimesData)
            } catch {
                void message.error('Không thể tải dữ liệu')
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const loadShowtimes = async () => {
        setIsLoading(true)
        try {
            const data = await getAllShowtimes()
            setShowtimes(data)
        } catch {
            void message.error('Không thể tải danh sách lịch chiếu')
        } finally {
            setIsLoading(false)
        }
    }

    const onSubmit = async (data: ShowtimePayload) => {
        if (new Date(data.endTime) <= new Date(data.startTime)) {
            void message.error('Giờ kết thúc phải sau giờ bắt đầu')
            return
        }
        try {
            setIsSaving(true)
            const payload = {
                movie: data.movieId,
                room: data.roomId,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                format: data.format,
                language: data.language,
                subtitle: data.subtitle,
                basePrice: data.basePrice,
                status: data.status,
            }
            if (editingId) {
                await updateShowtime(editingId, payload)
                void message.success('Cập nhật lịch chiếu thành công!')
                setEditingId(null)
            }
            else {
                await createShowtime(payload)
                void message.success('Tạo lịch chiếu thành công!')
            }
            await loadShowtimes()
            reset()
        } catch (error) {
            console.error(error)
            void message.error(editingId ? 'Cập nhật lịch chiếu thất bại.' : 'Tạo lịch chiếu thất bại. Vui lòng kiểm tra lại dữ liệu.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (showtime: Showtime) => {
        setEditingId(showtime._id)
        const pad = (n: number) => String(n).padStart(2, '0')
        const toLocalStr = (d: Date | string) => {
            const dt = new Date(d)
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
        }
        setValue('movieId', showtime.movie._id)
        setValue('roomId', showtime.room._id)
        setValue('startTime', toLocalStr(showtime.startTime))
        setValue('endTime', toLocalStr(showtime.endTime))
        setValue('format', showtime.format)
        setValue('language', showtime.language)
        setValue('subtitle', showtime.subtitle)
        setValue('basePrice', showtime.basePrice)
        setValue('status', showtime.status)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (showtime: Showtime) => {
        try {
            await deleteShowtime(showtime._id)
            void message.success('Đã xóa lịch chiếu thành công')
            loadShowtimes()
        } catch {
            void message.error('Xóa lịch chiếu thất bại')
        }
    }

    const selectedMovie = movies.find((m) => m._id === selectedMovieId)
    const movieDuration = (selectedMovie as Movie & { duration?: number })?.duration

    const columns: ColumnsType<Showtime> = [
        {
            title: 'Phim',
            key: 'movie',
            width: 220,
            render: (_, record) => (
                <Text strong style={{ fontSize: 13 }}>
                    {record.movie.title}
                </Text>
            ),
        },
        {
            title: 'Phòng chiếu',
            key: 'room',
            render: (_, record) => (
                <strong style={{ color: '#e11d48' }}>{record.room.name}</strong>
            ),
        },
        {
            title: 'Bắt đầu',
            key: 'startTime',
            width: 150,
            render: (_, record) => (
                <Tag icon={<ClockCircleOutlined />} color="blue">
                    {formatDateTime(record.startTime)}
                </Tag>
            ),
        },
        {
            title: 'Kết thúc',
            key: 'endTime',
            width: 150,
            render: (_, record) => (
                <Tag icon={<ClockCircleOutlined />} color="default">
                    {formatDateTime(record.endTime)}
                </Tag>
            ),
        },
        {
            title: 'Định dạng',
            dataIndex: 'format',
            key: 'format',
            width: 100,
            render: (format: string) => <Tag color="purple">{format}</Tag>,
        },
        {
            title: 'Giá vé',
            dataIndex: 'basePrice',
            key: 'basePrice',
            width: 120,
            render: (price: number) => (
                <Text strong style={{ color: '#d97706' }}>
                    {formatPrice(price)}
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 130,
            render: (_, record: Showtime) => {
                if (!record.status) {
                    return <Tag color="default">Ngừng chiếu</Tag>
                }
                const now = new Date()
                const start = new Date(record.startTime)
                const end = new Date(record.endTime)

                if (now < start) {
                    return <Tag color="blue">Sắp chiếu</Tag>
                } else if (now >= start && now <= end) {
                    return <Tag color="green">Đang chiếu</Tag>
                } else {
                    return <Tag color="orange">Đã chiếu</Tag>
                }
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            align: 'center' as const,
            render: (_: unknown, record: Showtime) => (
                <Space>
                    <Tooltip title="Xem ghế đã đặt">
                        <Button
                            type="text"
                            icon={<EyeOutlined style={{ color: '#0ea5e9' }} />}
                            onClick={() => void handleViewSeats(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined style={{ color: '#e11d48' }} />}
                            onClick={() => void handleEdit(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="xóa"
                        description="bạn có chắc muốn xóa không"
                        onConfirm={() => void handleDelete(record)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Xóa lịch chiếu">
                            <Button
                                type="text"
                                icon={<DeleteOutlined style={{ color: '#e11d48' }} />}
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
                {/* Form Card */}
                <Card
                    bordered={false}
                    style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
                    title={
                        <Space>
                            <CalendarOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
                            <Title level={4} style={{ margin: 0 }}>
                                {editingId ? 'Cập Nhật Lịch Chiếu' : 'Thêm Lịch Chiếu Mới'}
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
                                    reset()
                                }}
                            >
                                Hủy sửa
                            </Button>
                        )
                    }
                >
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label="Phim"
                                    validateStatus={errors.movieId ? 'error' : ''}
                                    help={errors.movieId?.message}
                                    required
                                >
                                    <Controller
                                        name="movieId"
                                        control={control}
                                        rules={{ required: 'Vui lòng chọn phim' }}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                placeholder="Chọn phim"
                                                showSearch
                                                optionFilterProp="label"
                                                style={{ width: '100%' }}
                                                options={movies.map((m) => ({ label: m.title, value: m._id }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label="Phòng chiếu"
                                    validateStatus={errors.roomId ? 'error' : ''}
                                    help={errors.roomId?.message}
                                    required
                                >
                                    <Controller
                                        name="roomId"
                                        control={control}
                                        rules={{ required: 'Vui lòng chọn phòng' }}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                placeholder="Chọn phòng chiếu"
                                                loading={isLoading}
                                                style={{ width: '100%' }}
                                                options={rooms.map((r) => ({
                                                    label: `${r.name} (${r.roomType})`,
                                                    value: r._id,
                                                }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Định dạng" required>
                                    <Controller
                                        name="format"
                                        control={control}
                                        render={({ field }) => (
                                            <Select {...field} style={{ width: '100%' }}>
                                                {FORMAT_OPTIONS.map((f) => (
                                                    <Option key={f} value={f}>
                                                        {f}
                                                    </Option>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {movieDuration && (
                            <Alert
                                type="info"
                                showIcon
                                icon={<ClockCircleOutlined />}
                                message={
                                    <span>
                                        Thời lượng phim: <strong>{movieDuration} phút</strong> — Giờ kết thúc sẽ được
                                        tính tự động khi chọn giờ bắt đầu.
                                    </span>
                                }
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label="Giờ bắt đầu"
                                    validateStatus={errors.startTime ? 'error' : ''}
                                    help={errors.startTime?.message}
                                    required
                                >
                                    <Controller
                                        name="startTime"
                                        control={control}
                                        rules={{ required: 'Vui lòng chọn giờ bắt đầu' }}
                                        render={({ field }) => (
                                            <DatePicker
                                                showTime={{ format: 'HH:mm', showSecond: false }}
                                                format="DD/MM/YYYY HH:mm"
                                                needConfirm={false}
                                                placeholder="Chọn ngày và giờ bắt đầu"
                                                style={{ width: '100%' }}
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(val) =>
                                                    field.onChange(val ? val.format('YYYY-MM-DDTHH:mm') : '')
                                                }
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                                <Form.Item
                                    label="Giờ kết thúc"
                                    validateStatus={errors.endTime ? 'error' : ''}
                                    help={errors.endTime?.message}
                                    required
                                >
                                    <Controller
                                        name="endTime"
                                        control={control}
                                        rules={{
                                            required: 'Vui lòng chọn giờ kết thúc',
                                            validate: (v) =>
                                                !startTimeValue ||
                                                new Date(v) > new Date(startTimeValue) ||
                                                'Giờ kết thúc phải sau giờ bắt đầu',
                                        }}
                                        render={({ field }) => (
                                            <DatePicker
                                                showTime={{ format: 'HH:mm', showSecond: false }}
                                                format="DD/MM/YYYY HH:mm"
                                                needConfirm={false}
                                                placeholder="Chọn ngày và giờ kết thúc"
                                                style={{ width: '100%' }}
                                                value={field.value ? dayjs(field.value) : null}
                                                onChange={(val) =>
                                                    field.onChange(val ? val.format('YYYY-MM-DDTHH:mm') : '')
                                                }
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={8}>
                                <Form.Item label="Ngôn ngữ">
                                    <Controller
                                        name="language"
                                        control={control}
                                        render={({ field }) => (
                                            <Input {...field} placeholder="Ví dụ: Tiếng Việt" />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item label="Phụ đề">
                                    <Controller
                                        name="subtitle"
                                        control={control}
                                        render={({ field }) => <Input {...field} placeholder="Ví dụ: Không / Tiếng Anh" />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item
                                    label="Giá vé (đ)"
                                    validateStatus={errors.basePrice ? 'error' : ''}
                                    help={errors.basePrice?.message}
                                    required
                                >
                                    <Controller
                                        name="basePrice"
                                        control={control}
                                        rules={{
                                            required: 'Vui lòng nhập giá vé',
                                            min: { value: 0, message: 'Giá không hợp lệ' },
                                        }}
                                        render={({ field }) => (
                                            <InputNumber
                                                {...field}
                                                style={{ width: '100%' }}
                                                min={0}
                                                step={1000}
                                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                addonAfter="đ"
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item label="Trạng thái" valuePropName="checked">
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onChange={field.onChange}
                                                checkedChildren="Kích hoạt"
                                                unCheckedChildren="Ẩn"
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        <Row justify="end">
                            <Col xs={24} sm={8} md={6}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<PlusOutlined />}
                                    loading={isSaving}
                                    block
                                    size="large"
                                    onClick={handleSubmit(onSubmit)}
                                >
                                    {isSaving
                                        ? 'Đang lưu...'
                                        : editingId
                                            ? 'Cập Nhật Lịch Chiếu'
                                            : 'Tạo Lịch Chiếu'}
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Card>

                <Card
                    bordered={false}
                    style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
                    title={
                        <Space>
                            <CalendarOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
                            <Title level={4} style={{ margin: 0 }}>
                                Danh Sách Lịch Chiếu
                            </Title>
                        </Space>
                    }
                    extra={
                        <Button
                            type="text"
                            icon={<ReloadOutlined spin={isLoading} />}
                            onClick={() => void loadShowtimes()}
                        >
                            Tải lại
                        </Button>
                    }
                >
                    <Table
                        dataSource={showtimes}
                        columns={columns}
                        rowKey="_id"
                        loading={isLoading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20', '50'],
                            showTotal: (total) => `Tổng ${total} lịch chiếu`,
                        }}
                        scroll={{ x: true }}
                    />
                </Card>
            </Space>

            <Modal
                title={
                    <Space>
                        <CalendarOutlined style={{ color: '#e11d48' }} />
                        <span>Sơ Đồ Ghế Đã Đặt - {viewingShowtime?.movie.title}</span>
                    </Space>
                }
                open={!!viewingShowtime}
                onCancel={() => setViewingShowtime(null)}
                footer={null}
                width={850}
                centered
            >
                {viewingShowtime && (() => {
                    const activeSeats = seats.filter(s => s.isActive)
                    return (
                        <div style={{ padding: '16px 0' }}>
                            <div style={{ marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <Row gutter={[16, 12]}>
                                    <Col xs={24} sm={12}><strong>Phòng chiếu:</strong> {viewingShowtime.room.name}</Col>
                                    <Col xs={24} sm={12}><strong>Thời gian:</strong> {formatDateTime(viewingShowtime.startTime)} - {formatDateTime(viewingShowtime.endTime)}</Col>
                                    <Col xs={24} sm={12}>
                                        <strong>Định dạng / Giá gốc:</strong> <Tag color="purple" style={{ marginRight: 8 }}>{viewingShowtime.format}</Tag>
                                        <span style={{ color: '#d97706', fontWeight: 'bold' }}>{formatPrice(viewingShowtime.basePrice)}</span>
                                    </Col>
                                </Row>


                            </div>

                            {isLoadingSeats ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <ReloadOutlined spin style={{ fontSize: 28, color: '#e11d48', marginBottom: 12 }} />
                                    <div style={{ color: '#64748b', fontWeight: 500 }}>Đang tải sơ đồ ghế...</div>
                                </div>
                            ) : (
                                <div style={{ width: '100%', margin: '0 auto' }}>
                                    <div className="seat-layout-panel" style={{ background: '#f8fafc', padding: '32px 16px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                                        <div className="screen-container" style={{ margin: '0 auto 40px auto', maxWidth: '400px', textAlign: 'center' }}>
                                            <div className="screen-line" style={{ height: '4px', background: '#cbd5e1', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                                            <span className="screen-text" style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '4px', fontWeight: 700, display: 'block', marginTop: '8px' }}>MÀN HÌNH CHÍNH</span>
                                        </div>

                                        <div className="seats-area-wrapper" style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                                            <div className="seats-rows-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                                {(() => {
                                                    const grouped: Record<string, Seat[]> = {}
                                                    activeSeats.forEach(seat => {
                                                        if (!grouped[seat.row]) {
                                                            grouped[seat.row] = []
                                                        }
                                                        grouped[seat.row].push(seat)
                                                    })
                                                    const sortedRows = Object.keys(grouped).sort()
                                                    sortedRows.forEach(row => {
                                                        grouped[row].sort((a, b) => a.number - b.number)
                                                    })

                                                    if (sortedRows.length === 0) {
                                                        return <div style={{ color: '#64748b', padding: '20px 0' }}>Không có sơ đồ ghế hoặc phòng chiếu chưa có ghế</div>
                                                    }

                                                    return sortedRows.map(row => (
                                                        <div key={row} className="seat-row-line" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <span className="row-label" style={{ fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'center' }}>{row}</span>
                                                            {grouped[row].map(seat => {
                                                                const isOccupied = occupiedSeatIds.has(seat._id)
                                                                let seatStyle: React.CSSProperties = {}
                                                                if (isOccupied) {
                                                                    // Ghế đã đặt: Chữ V màu xanh lá
                                                                    seatStyle = {
                                                                        background: '#dcfce7',
                                                                        borderColor: '#bbf7d0',
                                                                        color: '#16a34a',
                                                                        opacity: 1,
                                                                        textDecoration: 'none',
                                                                    }
                                                                } else {
                                                                    // Ghế chưa đặt (Chung một màu xám nhẹ)
                                                                    seatStyle = {
                                                                        background: '#f1f5f9',
                                                                        borderColor: '#cbd5e1',
                                                                        color: '#475569',
                                                                    }
                                                                }

                                                                return (
                                                                    <Tooltip
                                                                        key={seat._id}
                                                                        title={`${seat.code} (${seat.type.toUpperCase()}) - ${isOccupied ? 'Đã đặt' : 'Còn trống'}`}
                                                                    >
                                                                        <button
                                                                            className="seat-unit"
                                                                            style={{ cursor: 'default', ...seatStyle }}
                                                                            type="button"
                                                                        >
                                                                            {isOccupied ? 'V' : seat.type === 'disabled' ? '♿' : seat.number}
                                                                        </button>
                                                                    </Tooltip>
                                                                )
                                                            })}
                                                            <span className="row-label" style={{ fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'center' }}>{row}</span>
                                                        </div>
                                                    ))
                                                })()}
                                            </div>
                                        </div>

                                        <div className="seat-legend-bar" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '30px', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="seat-unit standard" style={{ cursor: 'default', background: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' }}>-</div>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Chưa đặt (Còn trống)</span>
                                            </div>
                                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="seat-unit occupied" style={{ cursor: 'default', background: '#16a34a', borderColor: '#bbf7d0', color: '#16a34a', opacity: 1 }}>V</div>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Đã đặt (V)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </Modal>
        </div>
    )
}

export default ManageShowtime