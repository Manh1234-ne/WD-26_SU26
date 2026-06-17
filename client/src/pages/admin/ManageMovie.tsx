import { useEffect, useMemo, useState } from 'react'
import {
  createMovie,
  deleteMovie,
  getMovies,
  updateMovie,
} from '../../features/movie/movie.service'
import type { Movie, MoviePayload, MovieStatus } from '../../features/movie/movie.types'
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
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
  VideoCameraOutlined,
  CalendarOutlined,
  StarOutlined,
  GlobalOutlined,
  UserOutlined,
  LinkOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography
const { TextArea } = Input

type MovieFormFields = {
  title: string
  originalTitle: string
  description: string
  genres: string
  duration: number
  releaseDate: dayjs.Dayjs
  ageRating: MoviePayload['ageRating']
  language: string
  director: string
  cast: string
  posterUrl: string
  backdropUrl: string
  trailerUrl: string
  status: MovieStatus
  averageRating: number
  isActive: boolean
}

const emptyFormValues = {
  title: '',
  originalTitle: '',
  description: '',
  genres: '',
  duration: 90,
  releaseDate: dayjs(),
  ageRating: 'P' as const,
  language: 'Vietnamese',
  director: '',
  cast: '',
  posterUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  status: 'coming_soon' as const,
  averageRating: 0,
  isActive: true,
}

function toList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toPayload(formValues: MovieFormFields): MoviePayload {
  return {
    title: formValues.title.trim(),
    originalTitle: formValues.originalTitle?.trim() || '',
    description: formValues.description.trim(),
    genres: toList(formValues.genres),
    duration: formValues.duration,
    releaseDate: formValues.releaseDate.format('YYYY-MM-DD'),
    ageRating: formValues.ageRating,
    language: formValues.language.trim(),
    director: formValues.director.trim(),
    cast: toList(formValues.cast),
    posterUrl: formValues.posterUrl.trim(),
    backdropUrl: formValues.backdropUrl.trim(),
    trailerUrl: formValues.trailerUrl.trim(),
    status: formValues.status,
    averageRating: formValues.averageRating,
    isActive: formValues.isActive,
  }
}

function toFormFields(movie: Movie): Partial<MovieFormFields> {
  return {
    title: movie.title,
    originalTitle: movie.originalTitle || '',
    description: movie.description,
    genres: movie.genres?.join(', ') || '',
    duration: movie.duration,
    releaseDate: dayjs(movie.releaseDate),
    ageRating: movie.ageRating,
    language: movie.language || 'Vietnamese',
    director: movie.director || '',
    cast: movie.cast?.join(', ') || '',
    posterUrl: movie.posterUrl || '',
    backdropUrl: movie.backdropUrl || '',
    trailerUrl: movie.trailerUrl || '',
    status: movie.status,
    averageRating: movie.averageRating || 0,
    isActive: movie.isActive ?? true,
  }
}

function ManageMovie() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [antdForm] = Form.useForm<MovieFormFields>()

  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => a.title.localeCompare(b.title)),
    [movies],
  )

  const loadMovies = async () => {
    setIsLoading(true)
    try {
      const data = await getMovies({ isActive: 'all', limit: '100' })
      setMovies(data)
    } catch {
      void message.error('Không thể tải danh sách phim.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMovies()
  }, [])

  const handleSubmit = async (values: MovieFormFields) => {
    setIsSaving(true)
    try {
      if (editingId) {
        await updateMovie(editingId, toPayload(values))
        void message.success('Đã cập nhật phim thành công!')
      } else {
        await createMovie(toPayload(values))
        void message.success('Đã thêm phim mới thành công!')
      }
      antdForm.resetFields()
      setEditingId(null)
      await loadMovies()
    } catch {
      void message.error('Lưu phim thất bại. ')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (movie: Movie) => {
    setEditingId(movie._id)
    antdForm.setFieldsValue(toFormFields(movie) as MovieFormFields)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (movie: Movie) => {
    try {
      await deleteMovie(movie._id)
      void message.success(`Đã xóa phim "${movie.title}"`)
      await loadMovies()
    } catch {
      void message.error('Xóa phim thất bại.')
    }
  }

  const getStatusTag = (status: MovieStatus) => {
    switch (status) {
      case 'coming_soon':
        return <Tag color="blue">Sắp chiếu</Tag>
      case 'now_showing':
        return <Tag color="green">Đang chiếu</Tag>
      case 'ended':
        return <Tag color="gray">Đã kết thúc</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getAgeRatingTag = (rating: Movie['ageRating']) => {
    switch (rating) {
      case 'P':
        return <Tag color="success">P - Mọi lứa tuổi</Tag>
      case 'K':
        return <Tag color="processing">K - Dưới 13 tuổi có giám hộ</Tag>
      case 'T13':
        return <Tag color="warning">T13 - Trên 13 tuổi</Tag>
      case 'T16':
        return <Tag color="orange">T16 - Trên 16 tuổi</Tag>
      case 'T18':
        return <Tag color="error">T18 - Trên 18 tuổi</Tag>
      case 'C':
        return <Tag color="magenta">C - Cấm phổ biến</Tag>
      default:
        return <Tag>{rating}</Tag>
    }
  }

  const columns: ColumnsType<Movie> = [
    {
      title: 'Phim',
      key: 'movie',
      render: (_, record) => (
        <Space align="start" size={12}>
          {record.posterUrl && (
            <img
              src={record.posterUrl}
              alt={record.title}
              style={{ width: 45, height: 65, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{record.title}</div>
            {record.originalTitle && (
              <div style={{ fontSize: '12px', color: '#8c8c8c', fontStyle: 'italic' }}>{record.originalTitle}</div>
            )}
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {getAgeRatingTag(record.ageRating)}
              {record.genres?.map((g) => (
                <Tag key={g} style={{ fontSize: '11px', marginInlineEnd: 0 }}>{g}</Tag>
              ))}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: MovieStatus) => getStatusTag(status),
    },
    {
      title: 'Ngày chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Hiển thị',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive?: boolean) => (
        <Tag color={isActive === false ? 'default' : 'cyan'}>
          {isActive === false ? 'Ẩn' : 'Hiện'}
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
            title="Xóa phim"
            description={`Bạn có chắc chắn muốn xóa phim "${record.title}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa phim">
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
        {/* Top: Create/Edit Form */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <VideoCameraOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                {editingId ? 'Cập Nhật Phim' : 'Thêm Phim Mới'}
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
                  label="Tên phim"
                  name="title"
                  rules={[{ required: true, message: 'Vui lòng nhập tên phim!' }]}
                >
                  <Input placeholder="Ví dụ: Lật Mặt 7" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Tên gốc" name="originalTitle">
                  <Input placeholder="Ví dụ: Face Off 7" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Trạng thái chiếu" name="status">
                  <Select>
                    <Select.Option value="coming_soon">Sắp chiếu</Select.Option>
                    <Select.Option value="now_showing">Đang chiếu</Select.Option>
                    <Select.Option value="ended">Đã kết thúc</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Mô tả phim"
              name="description"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
            >
              <TextArea rows={3} placeholder="Nhập tóm tắt nội dung phim..." />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Thể loại"
                  name="genres"
                  help="Phân tách bằng dấu phẩy (,)"
                >
                  <Input placeholder="Hành động, Hài hước" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Diễn viên"
                  name="cast"
                  help="Phân tách bằng dấu phẩy (,)"
                >
                  <Input placeholder="Diễn viên A, Diễn viên B" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Đạo diễn" name="director">
                  <Input prefix={<UserOutlined />} placeholder="Tên đạo diễn" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Ngôn ngữ" name="language">
                  <Input prefix={<GlobalOutlined />} placeholder="Phụ đề Tiếng Việt" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Thời lượng (phút)"
                  name="duration"
                  rules={[{ required: true, message: 'Nhập thời lượng!' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Ngày khởi chiếu"
                  name="releaseDate"
                  rules={[{ required: true, message: 'Chọn ngày chiếu!' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Đánh giá" name="averageRating">
                  <InputNumber
                    min={0}
                    max={5}
                    step={0.1}
                    style={{ width: '100%' }}
                    prefix={<StarOutlined style={{ color: '#fadb14' }} />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Phân loại độ tuổi" name="ageRating">
                  <Select>
                    <Select.Option value="P">P - Mọi lứa tuổi</Select.Option>
                    <Select.Option value="K">K - Dưới 13 tuổi có giám hộ</Select.Option>
                    <Select.Option value="T13">T13 - Trên 13 tuổi</Select.Option>
                    <Select.Option value="T16">T16 - Trên 16 tuổi</Select.Option>
                    <Select.Option value="T18">T18 - Trên 18 tuổi</Select.Option>
                    <Select.Option value="C">C - Cấm phổ biến</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Poster URL" name="posterUrl">
                  <Input prefix={<LinkOutlined />} placeholder="https://domain.com/poster.jpg" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Backdrop URL" name="backdropUrl">
                  <Input prefix={<LinkOutlined />} placeholder="https://domain.com/backdrop.jpg" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Trailer URL (Youtube)" name="trailerUrl">
                  <Input prefix={<LinkOutlined />} placeholder="https://youtube.com/..." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24} align="bottom" style={{ marginTop: '16px' }}>
              <Col xs={24} sm={8} md={6}>
                <Form.Item
                  name="isActive"
                  valuePropName="checked"
                  label="Hiển thị phim"
                  style={{ marginBottom: 0 }}
                >
                  <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" style={{ width: '70px' }} />
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
                    {isSaving ? 'Đang lưu phim...' : editingId ? 'Cập Nhật Thay Đổi' : 'Thêm Phim Mới'}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Bottom: Movies List */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <Space>
              <CalendarOutlined style={{ color: '#e11d48', fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0 }}>
                Danh Sách Kho Phim
              </Title>
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<ReloadOutlined spin={isLoading} />}
              onClick={loadMovies}
            >
              Tải lại
            </Button>
          }
        >
          <Table
            dataSource={sortedMovies}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: ['5', '8', '15', '30'] }}
            scroll={{ x: true }}
          />
        </Card>
      </Space>
    </div>
  )
}

export default ManageMovie

