import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../../features/movie/movie.service'
import type { Movie } from '../../features/movie/movie.types'

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
  const [error, setError] = useState('')

  useEffect(() => {
    getMovies()
      .then((data) => {
        setMovies(data)
      })
      .catch(() => {
        setError('Không thể lấy dữ liệu từ Dashboard')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const stats = useMemo(
    () => [
      {
        label: 'Tổng phim',
        value: movies.length,
        icon: <VideoCameraOutlined />,
      },
      {
        label: 'Đang chiếu',
        value: movies.filter(
          (movie) => movie.status === 'now_showing'
        ).length,
        icon: <PlayCircleOutlined />,
      },
      {
        label: 'Sắp chiếu',
        value: movies.filter(
          (movie) => movie.status === 'coming_soon'
        ).length,
        icon: <CalendarOutlined />,
      },
      {
        label: 'Tạm ẩn',
        value: movies.filter(
          (movie) => movie.isActive === false
        ).length,
        icon: <EyeInvisibleOutlined />,
      },
    ],
    [movies]
  )

  const columns: ColumnsType<Movie> = [
    {
      title: 'Poster',
      dataIndex: 'posterUrl',
      key: 'posterUrl',
      width: 90,
      render: (posterUrl, record) => (
        <img
          src={posterUrl}
          alt={record.title}
          style={{
            width: 50,
            height: 70,
            objectFit: 'cover',
            borderRadius: 6,
          }}
        />
      ),
    },
    {
      title: 'Tên phim',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        switch (status) {
          case 'now_showing':
            return <Tag color="green">Đang chiếu</Tag>

          case 'coming_soon':
            return <Tag color="blue">Sắp chiếu</Tag>

          default:
            return <Tag>Khác</Tag>
        }
      },
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => (
        <Space>
          <ClockCircleOutlined />
          {duration} phút
        </Space>
      ),
    },
    {
      title: 'Ngày chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      render: (date) =>
        dayjs(date).format('DD/MM/YYYY'),
    },
  ]

  return (
    <section style={{ padding: 24 }}>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2}>Dashboard</Title>
          <Text type="secondary">
            Thống kê hệ thống quản lý phim
          </Text>
        </div>

        <Link to="/admin/movies">
          <Button type="primary">
            Quản lý phim
            <RightOutlined />
          </Button>
        </Link>
      </Space>

      {error && (
        <Card style={{ marginBottom: 16 }}>
          <Text type="danger">{error}</Text>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {stats.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.label}>
            <Card>
              <Statistic
                title={item.label}
                value={item.value}
                prefix={item.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="Phim mới cập nhật"
        style={{ marginTop: 24 }}
      >
        <Table<Movie>
          rowKey="_id"
          columns={columns}
          dataSource={movies.slice(0, 6)}
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </section>
  )
}

export default Dashboard

