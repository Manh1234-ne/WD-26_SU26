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
  Modal,
  Descriptions,
  Upload,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  VideoCameraOutlined,
  CalendarOutlined,
  GlobalOutlined,
  UserOutlined,
  LinkOutlined,
  CloseOutlined,
  SaveOutlined,
  EyeOutlined,
  PlaySquareOutlined,
  TranslationOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  TagsOutlined,
  AlignLeftOutlined,
  PictureOutlined,
  YoutubeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography
const { TextArea } = Input

type MovieFormFields = {
  title: string
  originalTitle: string
  description: string
  genres: string[]
  duration: number
  releaseDate: dayjs.Dayjs
  ageRating: MoviePayload['ageRating']
  country: string
  director: string
  cast: string
  posterUrl: string
  trailerUrl: string
  status: MovieStatus
  endDate: dayjs.Dayjs
  isActive: boolean
}

const emptyFormValues = {
  title: '',
  originalTitle: '',
  description: '',
  genres: [],
  duration: 90,
  releaseDate: dayjs(),
  ageRating: 'P' as const,
  country: '',
  director: '',
  cast: '',
  posterUrl: '',
  trailerUrl: '',
  status: 'coming_soon' as const,
  endDate: dayjs().add(14, 'day'),
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
    genres: formValues.genres,
    duration: formValues.duration,
    releaseDate: formValues.releaseDate.format('YYYY-MM-DD'),
    ageRating: formValues.ageRating,
    country: formValues.country?.trim() || '',
    director: formValues.director.trim(),
    cast: toList(formValues.cast),
    posterUrl: formValues.posterUrl.trim(),
    trailerUrl: formValues.trailerUrl.trim(),
    status: formValues.status,
    endDate: formValues.endDate.format('YYYY-MM-DD'),
    isActive: formValues.isActive,
  }
}

function toFormFields(movie: Movie): Partial<MovieFormFields> {
  return {
    title: movie.title,
    originalTitle: movie.originalTitle || '',
    description: movie.description,
    genres: movie.genres || [],
    duration: movie.duration,
    releaseDate: dayjs(movie.releaseDate),
    ageRating: movie.ageRating,
    country: movie.country || '',
    director: movie.director || '',
    cast: movie.cast?.join(', ') || '',
    posterUrl: movie.posterUrl || '',
    trailerUrl: movie.trailerUrl || '',
    status: movie.status,
    endDate: dayjs(movie.endDate),
    isActive: movie.isActive ?? true,
  }
}

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function ManageMovie() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [antdForm] = Form.useForm<MovieFormFields>()
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const handleOpenDetails = (movie: Movie) => {
    setSelectedMovie(movie)
    setIsDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setSelectedMovie(null)
    setIsDetailsOpen(false)
  }

  const sortedMovies = useMemo(
    () => [...movies].sort((a, b) => a.title.localeCompare(b.title)),
    [movies],
  )

  const loadMovies = async () => {
    setIsLoading(true)
    try {
      const data = await getMovies()
      // Tự động cập nhật trạng thái dựa vào ngày hiện tại và ngày chiếu
      const computedData = data.map((movie: Movie) => {
        let computedStatus = movie.status;
        const today = dayjs().startOf('day').valueOf();
        const release = dayjs(movie.releaseDate).startOf('day').valueOf();
        const end = dayjs(movie.endDate).endOf('day').valueOf();

        if (today > end) {
          computedStatus = 'ended';
        } else if (today >= release && today <= end) {
          computedStatus = 'now_showing';
        } else if (today < release) {
          computedStatus = 'coming_soon';
        }

        return { ...movie, status: computedStatus };
      });
      setMovies(computedData)
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
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Lưu phim thất bại. Vui lòng kiểm tra lại dữ liệu.'
      void message.error(errMsg)
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
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#0ea5e9' }} />}
              onClick={() => handleOpenDetails(record)}
            />
          </Tooltip>
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
            requiredMark={false}
          >
            {/* SECTION 1: THÔNG TIN CƠ BẢN */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e11d48', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>1. Thông tin cơ bản</span>
              </div>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label={<span><PlaySquareOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Tên phim</strong></span>}
                    name="title"
                    rules={[{ required: true, message: 'Vui lòng nhập tên phim!' }]}
                  >
                    <Input prefix={<PlaySquareOutlined style={{ color: '#94a3b8' }} />} placeholder="Ví dụ: Lật Mặt 7" style={{ borderRadius: '6px' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span><TranslationOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Tên gốc (Tiếng Anh / Khác)</strong></span>} name="originalTitle">
                    <Input prefix={<TranslationOutlined style={{ color: '#94a3b8' }} />} placeholder="Ví dụ: Face Off 7" style={{ borderRadius: '6px' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label={<span><ClockCircleOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Thời lượng (phút)</strong></span>}
                    name="duration"
                    rules={[{ required: true, message: 'Nhập thời lượng!' }]}
                  >
                    <InputNumber prefix={<ClockCircleOutlined style={{ color: '#94a3b8' }} />} min={1} style={{ width: '100%', borderRadius: '6px' }} placeholder="90" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span><SafetyCertificateOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Phân loại độ tuổi</strong></span>} name="ageRating">
                    <Select style={{ borderRadius: '6px' }}>
                      <Select.Option value="P">P - Mọi lứa tuổi</Select.Option>
                      <Select.Option value="K">K - Dưới 13 tuổi có giám hộ</Select.Option>
                      <Select.Option value="T13">T13 - Trên 13 tuổi</Select.Option>
                      <Select.Option value="T16">T16 - Trên 16 tuổi</Select.Option>
                      <Select.Option value="T18">T18 - Trên 18 tuổi</Select.Option>
                      <Select.Option value="C">C - Cấm phổ biến</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span><AppstoreOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Trạng thái chiếu</strong></span>} name="status">
                    <Select style={{ borderRadius: '6px' }}>
                      <Select.Option value="coming_soon">Sắp chiếu</Select.Option>
                      <Select.Option value="now_showing">Đang chiếu</Select.Option>
                      <Select.Option value="ended">Đã kết thúc</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span><GlobalOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Quốc gia</strong></span>} name="country">
                    <Input prefix={<GlobalOutlined style={{ color: '#94a3b8' }} />} placeholder="Ví dụ: Việt Nam, Mỹ..." style={{ borderRadius: '6px' }} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* SECTION 2: CHI TIẾT SẢN XUẤT */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e11d48', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>2. Chi tiết sản xuất & Nội dung</span>
              </div>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label={<span><TagsOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Thể loại phim</strong></span>}
                    name="genres"
                    rules={[{ required: true, message: 'Vui lòng chọn thể loại!' }]}
                  >
                    <Select mode="multiple" placeholder="Chọn thể loại" style={{ borderRadius: '6px' }}>
                      <Select.Option value="Hành động">Hành động</Select.Option>
                      <Select.Option value="Tình cảm">Tình cảm</Select.Option>
                      <Select.Option value="Kinh dị">Kinh dị</Select.Option>
                      <Select.Option value="Hài hước">Hài hước</Select.Option>
                      <Select.Option value="Viễn tưởng">Viễn tưởng</Select.Option>
                      <Select.Option value="Kỳ ảo">Kỳ ảo</Select.Option>
                      <Select.Option value="Tâm lý">Tâm lý</Select.Option>
                      <Select.Option value="Tội phạm">Tội phạm</Select.Option>
                      <Select.Option value="Chiến tranh">Chiến tranh</Select.Option>
                      <Select.Option value="Xã hội">Xã hội</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label={<span><UserOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Đạo diễn</strong></span>} name="director">
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Tên đạo diễn" style={{ borderRadius: '6px' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label={<span><TeamOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Dàn diễn viên</strong></span>}
                    name="cast"
                    help={<span style={{ fontSize: '11px', color: '#94a3b8' }}>Phân tách bằng dấu phẩy (,). Ví dụ: Trấn Thành, Tuấn Trần</span>}
                  >
                    <Input prefix={<TeamOutlined style={{ color: '#94a3b8' }} />} placeholder="Diễn viên A, Diễn viên B" style={{ borderRadius: '6px' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label={<span><AlignLeftOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Tóm tắt nội dung phim</strong></span>}
                name="description"
                rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
              >
                <TextArea rows={4} placeholder="Nhập tóm tắt nội dung phim giúp khán giả nắm rõ cốt truyện..." style={{ borderRadius: '6px' }} />
              </Form.Item>
            </div>

            {/* SECTION 3: LỊCH TRÌNH CHIẾU */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e11d48', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>3. Thời gian phát hành</span>
              </div>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span><CalendarOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Ngày khởi chiếu</strong></span>}
                    name="releaseDate"
                    rules={[{ required: true, message: 'Chọn ngày chiếu!' }]}
                  >
                    <DatePicker style={{ width: '100%', borderRadius: '6px' }} format="DD/MM/YYYY" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span><CalendarOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Ngày kết thúc dự kiến</strong></span>}
                    name="endDate"
                    rules={[
                      { required: true, message: 'Chọn ngày kết thúc!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || !getFieldValue('releaseDate') || value.isAfter(getFieldValue('releaseDate')) || value.isSame(getFieldValue('releaseDate'))) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Ngày kết thúc phải sau hoặc bằng ngày chiếu!'));
                        },
                      }),
                    ]}
                  >
                    <DatePicker style={{ width: '100%', borderRadius: '6px' }} format="DD/MM/YYYY" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* SECTION 4: HÌNH ẢNH & ĐƯỜNG DẪN TRUYỀN THÔNG */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e11d48', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>4. Hình ảnh & Trailer</span>
              </div>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label={<span><PictureOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Poster (Ảnh dọc)</strong></span>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Form.Item name="posterUrl" noStyle>
                          <Input prefix={<LinkOutlined style={{ color: '#94a3b8' }} />} placeholder="https://domain.com/poster.jpg" style={{ borderRadius: '6px', flex: 1 }} />
                        </Form.Item>
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={async (file) => {
                            try {
                              const compressedBase64 = await compressImage(file, 600, 0.7);
                              antdForm.setFieldValue('posterUrl', compressedBase64);
                              void message.success('Đã chọn và xử lý ảnh Poster thành công!');
                            } catch (error) {
                              void message.error('Lỗi khi xử lý ảnh!');
                            }
                            return false;
                          }}
                        >
                          <Button style={{ borderRadius: '6px' }}>Chọn file</Button>
                        </Upload>
                      </div>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.posterUrl !== currentValues.posterUrl}
                      >
                        {({ getFieldValue }) => {
                          const url = getFieldValue('posterUrl');
                          return url ? (
                            <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
                              <img
                                src={url}
                                alt="Poster Preview"
                                referrerPolicy="no-referrer"
                                style={{
                                  height: '250px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                              />
                            </div>
                          ) : null;
                        }}
                      </Form.Item>
                    </div>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label={<span><YoutubeOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Trailer URL (Youtube)</strong></span>}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Form.Item name="trailerUrl" noStyle>
                        <Input prefix={<LinkOutlined style={{ color: '#94a3b8' }} />} placeholder="https://youtube.com/watch?v=..." style={{ borderRadius: '6px' }} />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => prevValues.trailerUrl !== currentValues.trailerUrl}
                      >
                        {({ getFieldValue }) => {
                          const url = getFieldValue('trailerUrl');
                          const embedUrl = getYouTubeEmbedUrl(url);
                          return embedUrl ? (
                            <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
                              <iframe
                                width="100%"
                                height="250px"
                                src={embedUrl}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              ></iframe>
                            </div>
                          ) : null;
                        }}
                      </Form.Item>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* FORM FOOTER CONTROLS */}
            <Row gutter={24} align="middle">
              <Col xs={24} sm={8} md={6}>
                <Form.Item
                  name="isActive"
                  valuePropName="checked"
                  label={<span><EyeOutlined style={{ color: '#e11d48', marginInlineEnd: '6px' }} /><strong>Trạng thái hiển thị</strong></span>}
                  style={{ marginBottom: 0 }}
                >
                  <Switch checkedChildren="Hiện trên Web" unCheckedChildren="Ẩn trên Web" style={{ width: '130px' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Form.Item style={{ marginBottom: 0 }}>
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
                      height: '46px',
                      float: 'right',
                      minWidth: '200px'
                    }}
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

      {/* Modal chi tiết phim */}
      <Modal
        title={
          <Space>
            <VideoCameraOutlined style={{ color: '#e11d48', fontSize: '18px' }} />
            <span>Chi Tiết Phim</span>
          </Space>
        }
        open={isDetailsOpen}
        onCancel={handleCloseDetails}
        footer={[
          <Button key="close" onClick={handleCloseDetails}>
            Đóng
          </Button>
        ]}
        width={800}
        destroyOnClose
        styles={{ body: { padding: '12px 0' } }}
      >
        {selectedMovie && (
          <div style={{ overflowX: 'hidden' }}>
            <div style={{ padding: '0 16px' }}>
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                  {selectedMovie.posterUrl ? (
                    <img
                      src={selectedMovie.posterUrl}
                      alt={selectedMovie.title}
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        maxHeight: '280px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        marginBottom: '12px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        height: '240px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#bfbfbf',
                        marginBottom: '12px',
                        margin: '0 auto',
                      }}
                    >
                      Không có ảnh poster
                    </div>
                  )}

                  <div style={{ marginBottom: '12px' }}>
                    <CalendarOutlined style={{ color: '#e11d48', fontSize: '16px', marginInlineEnd: '4px' }} />
                    <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                      {dayjs(selectedMovie.endDate).format('DD/MM/YYYY')}
                    </span>
                    <span style={{ color: '#8c8c8c', fontSize: '11px', display: 'block' }}>
                      Ngày kết thúc
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                    {getAgeRatingTag(selectedMovie.ageRating)}
                    {getStatusTag(selectedMovie.status)}
                  </div>
                </Col>

                <Col xs={24} sm={16} style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
                  <div style={{ marginBottom: '12px', wordWrap: 'break-word' }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedMovie.title}</h2>
                    {selectedMovie.originalTitle && (
                      <p style={{ margin: '2px 0 0 0', color: '#8c8c8c', fontStyle: 'italic' }}>
                        {selectedMovie.originalTitle}
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 4px 0', color: '#262626', fontWeight: 600 }}>Tóm tắt nội dung:</h4>
                    <div style={{ color: '#595959', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#fafafa', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #e11d48', maxHeight: '160px', overflowY: 'auto', fontSize: '14px' }}>
                      {selectedMovie.description}
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: '24px', overflowX: 'auto', width: '100%' }}>
                <Descriptions bordered column={1} size="small" style={{ minWidth: '300px', wordBreak: 'break-word' }}>
                  <Descriptions.Item label="Thời lượng" labelStyle={{ width: '150px' }}>
                    <strong>{selectedMovie.duration} phút</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Khởi chiếu">
                    {dayjs(selectedMovie.releaseDate).format('DD/MM/YYYY')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Đạo diễn">
                    {selectedMovie.director || 'Chưa cập nhật'}
                  </Descriptions.Item>

                  <Descriptions.Item label="Quốc gia">
                    {selectedMovie.country || 'Chưa cập nhật'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Thể loại">
                    <Space size={4} wrap>
                      {selectedMovie.genres && selectedMovie.genres.length > 0 ? (
                        selectedMovie.genres.map((g) => (
                          <Tag key={g} color="magenta" style={{ marginInlineEnd: 0 }}>{g}</Tag>
                        ))
                      ) : (
                        <span>Chưa cập nhật</span>
                      )}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Diễn viên">
                    <div style={{ maxHeight: 80, overflowY: "auto" }}>
                      <Space size={4} wrap>
                        {selectedMovie.cast?.length ? (
                          selectedMovie.cast.map((c) => (
                            <Tag key={c} style={{ marginInlineEnd: 0 }}>{c}</Tag>
                          ))
                        ) : (
                          <span>Chưa cập nhật</span>
                        )}
                      </Space>
                    </div>
                  </Descriptions.Item>
                  {selectedMovie.trailerUrl && (
                    <Descriptions.Item label="Trailer">
                      <a href={selectedMovie.trailerUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontWeight: 600, wordBreak: 'break-all' }}>
                        <LinkOutlined /> Xem Trailer
                      </a>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={selectedMovie.isActive === false ? 'default' : 'cyan'}>
                      {selectedMovie.isActive === false ? 'Ẩn' : 'Hiện'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ManageMovie

