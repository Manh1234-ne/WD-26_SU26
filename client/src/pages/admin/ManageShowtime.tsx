import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

import { getMovies } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

import { getCinemas } from '../../features/cinema/cinema.service'
import type { Cinema } from '../../features/cinema/cinema.types'

import { createShowtime, getAllShowtimes } from '../../features/showtime/showtime.service'
import type { Showtime } from '../../features/showtime/showtime.type'
import { getRooms } from '../../features/room/room.service'
import type { Room } from '../../features/room/room.types'

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
} from 'antd'
import {
    CalendarOutlined,
    PlusOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const FORMAT_OPTIONS = ['2D', '3D', 'IMAX', '4DX', 'ScreenX']

interface CreateShowtimePayload {
    movieId: string
    cinemaId: string
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
    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [showtimes, setShowtimes] = useState<Showtime[]>([])

    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingRooms, setIsLoadingRooms] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const {
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors },
    } = useForm<CreateShowtimePayload>({
        defaultValues: {
            movieId: '',
            cinemaId: '',
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

    const selectedCinemaId = watch('cinemaId')
    const selectedMovieId = watch('movieId')
    const startTimeValue = watch('startTime')

    // Auto-calculate end time from movie duration
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

    // Load rooms when cinema changes
    useEffect(() => {
        if (!selectedCinemaId) {
            setRooms([])
            setValue('roomId', '')
            return
        }
        const fetchRooms = async () => {
            setIsLoadingRooms(true)
            try {
                const data = await getRooms({ cinema: selectedCinemaId })
                setRooms(data)
            } catch {
                void message.error('Không thể tải danh sách phòng chiếu')
            } finally {
                setIsLoadingRooms(false)
            }
        }
        fetchRooms()
        setValue('roomId', '')
    }, [selectedCinemaId, setValue])


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const [moviesData, cinemasData, showtimesData] = await Promise.all([
                    getMovies(),
                    getCinemas(),
                    getAllShowtimes(),
                ])
                setMovies(moviesData)
                setCinemas(cinemasData.cinemas)
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

    const onSubmit = async (data: CreateShowtimePayload) => {
        if (new Date(data.endTime) <= new Date(data.startTime)) {
            void message.error('Giờ kết thúc phải sau giờ bắt đầu')
            return
        }
        try {
            setIsSaving(true)
            const payload = {
                movie: data.movieId,
                cinema: data.cinemaId,
                room: data.roomId,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                format: data.format,
                language: data.language,
                subtitle: data.subtitle,
                basePrice: data.basePrice,
                status: data.status,
            }
            const created = await createShowtime(payload)
            setShowtimes((prev) => [created, ...prev])
            void message.success('Tạo lịch chiếu thành công!')
            reset()
        } catch (error) {
            console.error(error)
            void message.error('Tạo lịch chiếu thất bại. Vui lòng kiểm tra lại dữ liệu.')
        } finally {
            setIsSaving(false)
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
                <Space size={10}>
                    {record.movie.imageUrl && (
                        <img
                            src={record.movie.imageUrl}
                            alt=""
                            style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        />
                    )}
                    <Text strong style={{ fontSize: 13 }}>
                        {record.movie.title}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Rạp / Phòng',
            key: 'cinema',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{record.cinema.name}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{record.room.name}</div>
                </div>
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
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status: boolean) => (
                <Tag color={status ? 'green' : 'default'}>{status ? 'Đang chiếu' : 'Ngừng chiếu'}</Tag>
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
                                Thêm Lịch Chiếu Mới
                            </Title>
                        </Space>
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
                                    label="Rạp chiếu"
                                    validateStatus={errors.cinemaId ? 'error' : ''}
                                    help={errors.cinemaId?.message}
                                    required
                                >
                                    <Controller
                                        name="cinemaId"
                                        control={control}
                                        rules={{ required: 'Vui lòng chọn rạp' }}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                placeholder="Chọn rạp"
                                                showSearch
                                                optionFilterProp="label"
                                                style={{ width: '100%' }}
                                                options={cinemas.map((c) => ({ label: c.name, value: c._id }))}
                                            />
                                        )}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
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
                                                placeholder={!selectedCinemaId ? 'Chọn rạp trước' : 'Chọn phòng chiếu'}
                                                disabled={!selectedCinemaId}
                                                loading={isLoadingRooms}
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
                                    {isSaving ? 'Đang tạo...' : 'Tạo Lịch Chiếu'}
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
        </div>
    )
}

export default ManageShowtime