import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

import { getMovies } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

import { createShowtime, deleteShowtime, getAllShowtimes, updateShowtime, massDeleteShowtimes } from '../../features/showtime/showtime.service'
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
    message,
    Popconfirm,
    Modal,
    Tooltip,
    DatePicker,
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

import { MassCreateShowtimeModal } from './MassCreateShowtimeModal'

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
    const [isMassCreateOpen, setIsMassCreateOpen] = useState(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

    const filteredShowtimes = React.useMemo(() => {
        const filtered = showtimes.filter(s => {
            // filter by date
            if (dateRange && dateRange[0] && dateRange[1]) {
                const startTime = dayjs(s.startTime);
                if (startTime.isBefore(dateRange[0].startOf('day')) || startTime.isAfter(dateRange[1].endOf('day'))) {
                    return false;
                }
            }
            // filter by status
            if (statusFilter !== 'all') {
                const now = dayjs();
                const start = dayjs(s.startTime);
                const end = dayjs(s.endTime);
                let computedStatus = '';
                if (now.isBefore(start)) computedStatus = 'upcoming';
                else if (now.isAfter(end)) computedStatus = 'ended';
                else computedStatus = 'showing';

                if (computedStatus !== statusFilter) return false;
            }
            return true;
        })

        return filtered.sort((a, b) => {
            const now = dayjs();
            const getGroup = (s: Showtime) => {
                const start = dayjs(s.startTime);
                const end = dayjs(s.endTime);
                if (now.isBefore(start)) return { weight: 2, order: 1 }; // Upcoming, Ascending
                if (now.isAfter(end)) return { weight: 3, order: -1 }; // Ended, Descending
                return { weight: 1, order: -1 }; // Playing, Descending
            };

            const groupA = getGroup(a);
            const groupB = getGroup(b);

            if (groupA.weight !== groupB.weight) {
                return groupA.weight - groupB.weight;
            }

            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            return (timeA - timeB) * groupA.order;
        });
    }, [showtimes, dateRange, statusFilter])

    // States for viewing seats
    const [viewingShowtime, setViewingShowtime] = useState<Showtime | null>(null)
    const [seats, setSeats] = useState<Seat[]>([])
    const [seatStatusMap, setSeatStatusMap] = useState<Map<string, string>>(new Map())
    const [isLoadingSeats, setIsLoadingSeats] = useState(false)

    const handleViewSeats = async (showtime: Showtime) => {
        setViewingShowtime(showtime)
        setIsLoadingSeats(true)
        setSeats([])
        setSeatStatusMap(new Map())
        try {
            const seatRes = await getSeatsByRoom(showtime.room._id)
            const seatsList = seatRes?.seats || []
            setSeats(seatsList)

            const occupiedRes = await api.get(`/booking-seats/showtime/${showtime._id}/occupied`)
            const occupiedData = occupiedRes.data?.data || []
            const newSeatMap = new Map<string, string>()
            occupiedData.forEach((os: any) => {
                const seatId = os.seat?._id || os.seat;
                newSeatMap.set(seatId, os.status);
            })
            setSeatStatusMap(newSeatMap)
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
        getValues,
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
    const selectedRoomId = watch('roomId')

    const selectedMovie = movies.find((m) => m._id === selectedMovieId)
    const selectedRoom = rooms.find((r) => r._id === selectedRoomId)

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

    useEffect(() => {
        if (!selectedMovieId || !startTimeValue) return
        const movie = movies.find((m) => m._id === selectedMovieId)
        const duration = (movie as Movie & { duration?: number })?.duration
        if (!duration) return

        const start = new Date(startTimeValue)
        if (isNaN(start.getTime())) return

        const end = new Date(start.getTime() + (Number(duration) + 20) * 60 * 1000)
        const pad = (n: number) => String(n).padStart(2, '0')
        const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
        setValue('endTime', endStr)
    }, [selectedMovieId, startTimeValue, movies, setValue])

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [moviesData, roomsData, showtimesData] = await Promise.all([
                    getMovies({ isActive: 'true', limit: '1000' }),
                    getRooms(),
                    getAllShowtimes({ includePast: true }),
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
            const data = await getAllShowtimes({ includePast: true })
            setShowtimes(data)
        } catch {
            void message.error('Không thể tải danh sách lịch chiếu')
        } finally {
            setIsLoading(false)
        }
    }

    const handleMassDelete = async () => {
        try {
            setIsLoading(true)
            await massDeleteShowtimes(selectedRowKeys as string[])
            void message.success('Xóa hàng loạt suất chiếu thành công!')
            setSelectedRowKeys([])
            await loadShowtimes()
        } catch (err: any) {
            void message.error(err.response?.data?.message || 'Không thể xóa các suất chiếu đã chọn')
        } finally {
            setIsLoading(false)
        }
    }

    const onSubmit = async (data: ShowtimePayload) => {
        const start = new Date(data.startTime)
        const end = new Date(data.endTime)
        if (end <= start) {
            void message.error('Giờ kết thúc phải sau giờ bắt đầu')
            return
        }

        const startH = start.getHours()
        const endH = end.getHours()
        const endM = end.getMinutes()
        const isSameDay = end.getFullYear() === start.getFullYear() &&
            end.getMonth() === start.getMonth() &&
            end.getDate() === start.getDate()

        if (startH < 8 || !isSameDay || endH > 23 || (endH === 23 && endM > 0)) {
            void message.error('Rạp chỉ hoạt động từ 08:00 đến 23:00. Vui lòng chọn lịch chiếu trong khung giờ này!')
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
                status: data.status ? "open" : "closed",
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
        } catch (error: any) {
            console.error(error)
            const errMsg = error.response?.data?.message || (editingId ? 'Cập nhật lịch chiếu thất bại.' : 'Tạo lịch chiếu thất bại. Vui lòng kiểm tra lại dữ liệu.')
            void message.error(errMsg)
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
        setValue('status', showtime.status !== 'closed' && showtime.status !== 'cancelled')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (showtime: Showtime) => {
        try {
            await deleteShowtime(showtime._id)
            void message.success('Đã xóa lịch chiếu thành công')
            loadShowtimes()
        } catch (error: any) {
            void message.error(error.response?.data?.message || 'Xóa lịch chiếu thất bại')
        }
    }

    const movieDuration = (selectedMovie as Movie & { duration?: number })?.duration

    const columns: ColumnsType<Showtime> = [
        {
            title: 'Phim',
            key: 'movie',
            width: 220,
            render: (_, record) => (
                <Text strong style={{ fontSize: 13 }}>
                    {record.movie?.title || 'Phim không tồn tại'}
                </Text>
            ),
        },
        {
            title: 'Phòng chiếu',
            key: 'room',
            render: (_, record) => {
                let typeName: string = record.room?.roomType || '';
                if (record.room?.roomType === '2D') typeName = 'Tiêu chuẩn';
                if (record.room?.roomType === 'VIP') typeName = 'VIP';
                if (record.room?.roomType === 'IMAX') typeName = 'IMAX';
                return (
                    <strong style={{ color: '#e11d48' }}>
                        {record.room ? `${record.room.name} - ${typeName}` : 'Phòng không tồn tại'}
                    </strong>
                );
            },
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
                if (record.status === 'closed' || record.status === 'cancelled' || record.status === false as any) {
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
                {/* Modern Form Card */}
                <Card
                    bordered={false}
                    style={{
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        background: '#ffffff',
                    }}
                    title={
                        <Space size={12}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                            }}>
                                <CalendarOutlined style={{ color: '#ffffff', fontSize: '20px' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                                    {editingId ? 'Cập Nhật Lịch Chiếu' : 'Thêm Lịch Chiếu Mới'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    {editingId ? 'Thay đổi thông tin suất chiếu đã chọn' : 'Lập lịch chiếu mới cho phim và phòng chiếu'}
                                </Text>
                            </div>
                        </Space>
                    }
                    extra={
                        editingId && (
                            <Button
                                icon={<CloseOutlined />}
                                shape="round"
                                type="default"
                                danger
                                onClick={() => {
                                    setEditingId(null)
                                    reset()
                                }}
                            >
                                Hủy chỉnh sửa
                            </Button>
                        )
                    }
                >
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {/* Section 1: Phim, Phòng chiếu & Định dạng */}
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                            <Text strong style={{ color: '#e11d48', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>
                                📌 1. THÔNG TIN PHIM & PHÒNG CHIẾU
                            </Text>
                            <Row gutter={[20, 16]}>
                                <Col xs={24} md={10}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 700, color: '#334155' }}>Chọn Phim Chiếu</span>}
                                        validateStatus={errors.movieId ? 'error' : ''}
                                        help={errors.movieId?.message}
                                        required
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="movieId"
                                            control={control}
                                            rules={{ required: 'Vui lòng chọn phim' }}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    placeholder="-- Chọn phim chiếu --"
                                                    showSearch
                                                    size="large"
                                                    optionFilterProp="label"
                                                    options={movies.filter(m => dayjs(m.endDate).endOf('day').valueOf() >= dayjs().startOf('day').valueOf()).map((m) => ({ label: m.title, value: m._id }))}
                                                    disabled={!!editingId}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 700, color: '#334155' }}>Chọn Phòng Chiếu</span>}
                                        validateStatus={errors.roomId ? 'error' : ''}
                                        help={errors.roomId?.message}
                                        required
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="roomId"
                                            control={control}
                                            rules={{ required: 'Vui lòng chọn phòng' }}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    placeholder="-- Chọn phòng --"
                                                    loading={isLoading}
                                                    size="large"
                                                    style={{ width: '100%' }}
                                                    options={rooms.filter(r => r.isActive !== false).map((r) => {
                                                        let typeName: string = r.roomType;
                                                        if (r.roomType === '2D') typeName = 'Tiêu chuẩn';
                                                        if (r.roomType === 'VIP') typeName = 'VIP';
                                                        if (r.roomType === 'IMAX') typeName = 'IMAX';
                                                        return {
                                                            label: `${r.name} - ${typeName}`,
                                                            value: r._id,
                                                        }
                                                    })}
                                                    disabled={!!editingId}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Form.Item label={<span style={{ fontWeight: 700, color: '#334155' }}>Định Dạng</span>} required style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="format"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} size="large" style={{ width: '100%' }} disabled={!!editingId}>
                                                    {availableFormats.length === 0 ? (
                                                        <Option value="" disabled>Không có định dạng phù hợp</Option>
                                                    ) : (
                                                        availableFormats.map((f) => (
                                                            <Option key={f} value={f}>
                                                                {f}
                                                            </Option>
                                                        ))
                                                    )}
                                                </Select>
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Banner thời lượng phim */}
                        {movieDuration && (
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#1d4ed8'
                            }}>
                                <ClockCircleOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                    Thời lượng phim: <strong style={{ color: '#1e40af', fontSize: '14px' }}>{movieDuration} phút</strong> + <strong style={{ color: '#059669', fontSize: '14px' }}>20 phút Quãng Nghỉ</strong>. Giờ kết thúc tự động tính toán.
                                </span>
                            </div>
                        )}

                        {/* Section 2: Khung giờ chiếu */}
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                            <Text strong style={{ color: '#e11d48', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>
                                ⏰ 2. KHUNG GIỜ CHIẾU (HOẠT ĐỘNG TỪ 08:00 ĐẾN 23:00)
                            </Text>
                            <Row gutter={[20, 16]}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 700, color: '#334155' }}>Giờ Bắt Đầu</span>}
                                        validateStatus={errors.startTime ? 'error' : ''}
                                        help={errors.startTime?.message}
                                        required
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="startTime"
                                            control={control}
                                            rules={{
                                                required: 'Vui lòng chọn giờ bắt đầu',
                                                validate: (v) => {
                                                    const dt = new Date(v)
                                                    if (isNaN(dt.getTime())) return true
                                                    const h = dt.getHours()
                                                    if (h < 8 || h >= 23) {
                                                        return 'Rạp mở cửa từ 08:00 đến 23:00. Vui lòng chọn giờ bắt đầu từ 08:00 đến 22:59.'
                                                    }
                                                    return true
                                                }
                                            }}
                                            render={({ field }) => (
                                                <Input
                                                    type="datetime-local"
                                                    size="large"
                                                    style={{
                                                        borderRadius: '8px',
                                                        fontWeight: 600,
                                                        color: '#0f172a'
                                                    }}
                                                    value={field.value ? field.value.slice(0, 16) : ''}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                    disabled={!!editingId}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 700, color: '#334155' }}>Giờ Kết Thúc (Tự động)</span>}
                                        validateStatus={errors.endTime ? 'error' : ''}
                                        help={errors.endTime?.message}
                                        required
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="endTime"
                                            control={control}
                                            rules={{
                                                required: 'Vui lòng chọn giờ kết thúc',
                                                validate: (v) => {
                                                    if (!v) return true
                                                    const end = new Date(v)
                                                    if (isNaN(end.getTime())) return true
                                                    if (startTimeValue) {
                                                        const start = new Date(startTimeValue)
                                                        if (end <= start) return 'Giờ kết thúc phải sau giờ bắt đầu'
                                                        const isSameDay = end.getFullYear() === start.getFullYear() &&
                                                            end.getMonth() === start.getMonth() &&
                                                            end.getDate() === start.getDate()
                                                        if (!isSameDay) return 'Suất chiếu phải kết thúc trong cùng ngày'
                                                    }
                                                    const h = end.getHours()
                                                    const m = end.getMinutes()
                                                    if (h < 8 || h > 23 || (h === 23 && m > 0)) {
                                                        return 'Rạp đóng cửa lúc 23:00. Suất chiếu phải kết thúc muộn nhất là 23:00.'
                                                    }
                                                    return true
                                                }
                                            }}
                                            render={({ field }) => (
                                                <Input
                                                    type="datetime-local"
                                                    size="large"
                                                    style={{
                                                        borderRadius: '8px',
                                                        fontWeight: 600,
                                                        color: '#0f172a',
                                                        backgroundColor: '#f1f5f9',
                                                        cursor: 'not-allowed'
                                                    }}
                                                    value={field.value ? field.value.slice(0, 16) : ''}
                                                    readOnly
                                                    disabled={!!editingId}
                                                />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Section 3: Thiết lập chi tiết & Giá vé */}
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
                            <Text strong style={{ color: '#e11d48', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>
                                💵 3. THIẾT LẬP GIÁ VÉ & TRẠNG THÁI
                            </Text>
                            <Row gutter={[20, 16]}>
                                <Col xs={24} sm={12} md={8}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 700, color: '#334155' }}>Giá Vé Gốc (VND)</span>}
                                        validateStatus={errors.basePrice ? 'error' : ''}
                                        help={errors.basePrice?.message}
                                        required
                                        style={{ marginBottom: 0 }}
                                    >
                                        <Controller
                                            name="basePrice"
                                            control={control}
                                            rules={{
                                                required: 'Vui lòng nhập giá vé',
                                                min: { value: 0, message: 'Giá không hợp lệ' },
                                            }}
                                            render={({ field }) => (
                                                <Space.Compact style={{ width: '100%' }}>
                                                    <InputNumber
                                                        {...field}
                                                        size="large"
                                                        style={{ width: '100%' }}
                                                        min={0}
                                                        step={5000}
                                                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                        disabled={!!editingId}
                                                    />
                                                    <Button size="large" style={{ backgroundColor: '#fafafa', color: 'rgba(0,0,0,0.65)', cursor: 'default', borderLeft: 0 }}>VNĐ</Button>
                                                </Space.Compact>
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={5}>
                                    <Form.Item label={<span style={{ fontWeight: 700, color: '#334155' }}>Ngôn Ngữ</span>} style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="language"
                                            control={control}
                                            render={({ field }) => (
                                                <Input {...field} size="large" placeholder="VD: Tiếng Việt" disabled={!!editingId} />
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={5}>
                                    <Form.Item label={<span style={{ fontWeight: 700, color: '#334155' }}>Phụ Đề</span>} style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="subtitle"
                                            control={control}
                                            render={({ field }) => <Input {...field} size="large" placeholder="VD: Tiếng Anh" disabled={!!editingId} />}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={6}>
                                    <Form.Item label={<span style={{ fontWeight: 700, color: '#334155' }}>Trạng Thái Mở Bán</span>} valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Controller
                                            name="status"
                                            control={control}
                                            render={({ field }) => (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '40px' }}>
                                                    <Switch
                                                        checked={field.value}
                                                        onChange={field.onChange}
                                                        checkedChildren="Mở bán"
                                                        unCheckedChildren="Ẩn"
                                                    />
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: field.value ? '#16a34a' : '#64748b' }}>
                                                        {field.value ? 'Đang kích hoạt' : 'Đang tạm ẩn'}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Nút hành động */}
                        <Row justify="end" gutter={12}>
                            {editingId && (
                                <Col>
                                    <Button
                                        size="large"
                                        style={{ borderRadius: '8px' }}
                                        onClick={() => {
                                            setEditingId(null)
                                            reset()
                                        }}
                                    >
                                        Hủy
                                    </Button>
                                </Col>
                            )}
                            {!editingId && (
                                <Col xs={24} sm={8} md={6}>
                                    <Button
                                        size="large"
                                        block
                                        style={{
                                            borderRadius: '8px',
                                            borderColor: '#2563eb',
                                            color: '#2563eb',
                                            fontWeight: 600,
                                            height: '44px'
                                        }}
                                        onClick={() => setIsMassCreateOpen(true)}
                                    >
                                        Tạo Hàng Loạt
                                    </Button>
                                </Col>
                            )}
                            <Col xs={24} sm={8} md={6}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<PlusOutlined />}
                                    loading={isSaving}
                                    block
                                    size="large"
                                    style={{
                                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                        borderColor: '#e11d48',
                                        boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        height: '44px'
                                    }}
                                    onClick={handleSubmit(onSubmit)}
                                >
                                    {isSaving
                                        ? 'Đang lưu...'
                                        : editingId
                                            ? 'Cập Nhật Lịch Chiếu'
                                            : 'Tạo Lịch Chiếu Mới'}
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
                        <Space size="middle" wrap>
                            {selectedRowKeys.length > 0 && (
                                <Popconfirm
                                    title="Xóa hàng loạt suất chiếu"
                                    description={`Bạn có chắc muốn xóa ${selectedRowKeys.length} suất chiếu này?`}
                                    onConfirm={handleMassDelete}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button danger loading={isLoading}>
                                        Xóa {selectedRowKeys.length} lịch
                                    </Button>
                                </Popconfirm>
                            )}
                            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}>
                                <Select.Option value="all">Tất cả trạng thái</Select.Option>
                                <Select.Option value="upcoming">Sắp chiếu</Select.Option>
                                <Select.Option value="showing">Đang chiếu</Select.Option>
                                <Select.Option value="ended">Đã kết thúc</Select.Option>
                            </Select>
                            <DatePicker.RangePicker
                                onChange={(dates) => setDateRange(dates as any)}
                                format="DD/MM/YYYY"
                                placeholder={['Từ ngày', 'Đến ngày']}
                                allowClear
                            />
                            <Button
                                type="text"
                                icon={<ReloadOutlined spin={isLoading} />}
                                onClick={() => void loadShowtimes()}
                            >
                                Tải lại
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        rowSelection={{
                            selectedRowKeys,
                            onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
                        }}
                        dataSource={filteredShowtimes}
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

                                                    return sortedRows.map(row => {
                                                        const rowSeats = grouped[row];
                                                        const maxSeatNum = Math.max(...rowSeats.map(s => s.number), 0);
                                                        const elements = [];

                                                        for (let num = 1; num <= maxSeatNum; num++) {
                                                            const seat = rowSeats.find(s => s.number === num);
                                                            if (seat) {
                                                                const seatStatus = seatStatusMap.get(seat._id);
                                                                const isBooked = seatStatus === 'booked';
                                                                const isHeld = seatStatus === 'held';
                                                                let seatStyle: React.CSSProperties = {}
                                                                if (isBooked) {
                                                                    // Ghế đã đặt: Chữ V màu xanh lá
                                                                    seatStyle = {
                                                                        background: '#dcfce7',
                                                                        borderColor: '#bbf7d0',
                                                                        color: '#16a34a',
                                                                        opacity: 1,
                                                                        textDecoration: 'none',
                                                                    }
                                                                } else if (isHeld) {
                                                                    // Ghế đang giữ: Chữ ⏳ màu cam
                                                                    seatStyle = {
                                                                        background: '#fef3c7',
                                                                        borderColor: '#fde68a',
                                                                        color: '#d97706',
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

                                                                const isCouple = seat.type === 'couple';

                                                                elements.push(
                                                                    <div key={seat._id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                        <Tooltip
                                                                            title={`${seat.code} (${seat.type.toUpperCase()}) - ${isBooked ? 'Đã đặt' : isHeld ? 'Đang giữ' : 'Còn trống'}`}
                                                                        >
                                                                            <button
                                                                                className={`seat-unit ${seat.type}`}
                                                                                style={{ cursor: 'default', ...seatStyle }}
                                                                                type="button"
                                                                            >
                                                                                {isBooked ? 'V' : isHeld ? '⏳' : seat.type === 'disabled' ? '♿' : isCouple ? `${seat.number} - ${seat.number + 1}` : seat.number}
                                                                            </button>
                                                                        </Tooltip>
                                                                    </div>
                                                                )

                                                                if (isCouple) num++;
                                                            } else {
                                                                elements.push(
                                                                    <div key={`gap-${num}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                        <div style={{ width: '32px', height: '32px' }} />
                                                                    </div>
                                                                )
                                                            }
                                                        }

                                                        return (
                                                            <div key={row} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                                                                <div className="seat-row-line" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                    <span className="row-label" style={{ fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'center' }}>{row}</span>
                                                                    {elements}
                                                                    <span className="row-label" style={{ fontWeight: 800, color: '#94a3b8', width: '24px', textAlign: 'center' }}>{row}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
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
                                            <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="seat-unit occupied" style={{ cursor: 'default', background: '#fef3c7', borderColor: '#fde68a', color: '#d97706', opacity: 1 }}>⏳</div>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Đang giữ (⏳)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </Modal>

            <MassCreateShowtimeModal
                isOpen={isMassCreateOpen}
                onClose={() => setIsMassCreateOpen(false)}
                movies={movies}
                rooms={rooms}
                existingShowtimes={showtimes}
                onSuccess={() => void loadShowtimes()}
            />
        </div>
    )
}

export default ManageShowtime