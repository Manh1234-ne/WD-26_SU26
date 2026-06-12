import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../../features/movie/movie.service'
import type { Movie, MovieStatus } from '../../features/movie/movie.types'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  message,
} from 'antd'
import {
  VideoCameraOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  EyeInvisibleOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function Dashboard() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMovies()
      .then((data) => {
        setMovies(data)
      })
      .catch(() => {
        void message.error('Không thể lấy dữ liệu dashboard.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const stats = useMemo(
    () => [
      {
        label: 'Tổng phim',
        value: movies.length,
        icon: <VideoCameraOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
        color: '#e6f7ff',
        border: '#91d5ff',
      },
      {
        label: 'Đang chiếu',
        value: movies.filter((movie) => movie.status === 'now_showing').length,
        icon: <PlayCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
        color: '#f6ffed',
        border: '#b7eb8f',
      },
      {
        label: 'Sắp chiếu',
        value: movies.filter((movie) => movie.status === 'coming_soon').length,
        icon: <CalendarOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
        color: '#fff7e6',
        border: '#ffd591',
      },
      {
        label: 'Tạm ẩn',
        value: movies.filter((movie) => movie.isActive === false).length,
        icon: <EyeInvisibleOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />,
        color: '#f5f5f5',
        border: '#d9d9d9',
      },
    ],
    [movies],
  )

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

  const columns: ColumnsType<Movie> = [
    {
      title: 'Phim',
      key: 'movie',
      render: (_, record) => (
        <Space size={12}>
          {record.posterUrl && (
            <img
              src={record.posterUrl}
              alt={record.title}
              style={{ width: 35, height: 50, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{record.title}</div>
            {record.originalTitle && (
              <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{record.originalTitle}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: MovieStatus) => getStatusTag(status),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 150,
      render: (duration: number) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <span>{duration} phút</span>
        </Space>
      ),
    },
    {
      title: 'Ngày chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
  ]

  const recentMovies = useMemo(() => movies.slice(0, 6), [movies])

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* Stats Section */}
        <Row gutter={[16, 16]}>
          {stats.map((stat) => (
            <Col xs={24} sm={12} lg={6} key={stat.label}>
              <Card
                bordered={true}
                style={{
                  backgroundColor: stat.color,
                  borderColor: stat.border,
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: '14px' }}>{stat.label}</Text>}
                      value={stat.value}
                      valueStyle={{ fontSize: '28px', fontWeight: 'bold', color: '#262626' }}
                    />
                  </Col>
                  <Col>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        display: 'flex',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      }}
                    >
                      {stat.icon}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Recently Updated Section */}
        <Card
          bordered={false}
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', borderRadius: '12px' }}
          title={
            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Danh sách
              </Text>
              <Title level={4} style={{ margin: 0 }}>
                Phim Mới Cập Nhật
              </Title>
            </div>
          }
          extra={
            <Link to="/admin/movies">
              <Button type="primary" icon={<RightOutlined />} iconPosition="end">
                Quản lý phim
              </Button>
            </Link>
          }
        >
          <Table
            dataSource={recentMovies}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={false}
            scroll={{ x: true }}
          />
        </Card>
      </Space>
    </div>
  )
}

export default Dashboard
