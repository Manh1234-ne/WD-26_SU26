
import { useMemo, useState } from 'react'
import { Button, Card, Col, Input, Row, Select, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

type UserRole = 'admin' | 'customer'
type UserStatus = 'active' | 'inactive'

type UserRecord = {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  phone: string
  createdAt: string
}

const sampleUsers: UserRecord[] = [
  {
    id: 'u1',
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    role: 'admin',
    status: 'active',
    phone: '0901234567',
    createdAt: '2026-06-10T08:32:00.000Z',
  },
  {
    id: 'u2',
    fullName: 'Trần Thị B',
    email: 'tranthib@example.com',
    role: 'customer',
    status: 'active',
    phone: '0987654321',
    createdAt: '2026-06-12T11:25:00.000Z',
  },
  {
    id: 'u3',
    fullName: 'Lê Văn C',
    email: 'levanc@example.com',
    role: 'customer',
    status: 'inactive',
    phone: '0912345678',
    createdAt: '2026-06-14T14:50:00.000Z',
  },
  {
    id: 'u4',
    fullName: 'Phạm Thị D',
    email: 'phamthid@example.com',
    role: 'admin',
    status: 'active',
    phone: '0938765432',
    createdAt: '2026-06-15T09:10:00.000Z',
  },
]

const roleOptions = [
  { label: 'Tất cả vai trò', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Khách hàng', value: 'customer' },
] as const

const statusOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Hoạt động', value: 'active' },
  { label: 'Vô hiệu hoá', value: 'inactive' },
] as const

const roleTag = (role: UserRole) => {
  return role === 'admin' ? <Tag color="volcano">Admin</Tag> : <Tag color="blue">Khách hàng</Tag>
}

const statusTag = (status: UserStatus) => {
  return status === 'active' ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Vô hiệu hoá</Tag>
}

function ManageUser() {
  const [searchValue, setSearchValue] = useState('')
  const [roleFilter, setRoleFilter] = useState<typeof roleOptions[number]['value']>('all')
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]['value']>('all')

  const filteredUsers = useMemo(
    () =>
      sampleUsers.filter((user) => {
        const searchLower = searchValue.trim().toLowerCase()
        const matchesSearch =
          !searchLower ||
          [user.fullName, user.email, user.phone, user.role]
            .join(' ')
            .toLowerCase()
            .includes(searchLower)

        const matchesRole = roleFilter === 'all' ; user.role === roleFilter
        const matchesStatus = statusFilter === 'all' ; user.status === statusFilter

        return matchesSearch ; matchesRole ; matchesStatus
      }),
    [searchValue, roleFilter, statusFilter],
  )

  const columns: ColumnsType<UserRecord> = [
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 220,
      render: (value, record) => (
        <div>
          <div style={{ fontWeight: 700 }}>{value}</div>
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role) => roleTag(role),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => statusTag(status),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 170,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="default" size="small">
            Chi tiết
          </Button>
          <Button type={record.status === 'active' ? 'dashed' : 'primary'} danger={record.status === 'active'} size="small">
            {record.status === 'active' ? 'Vô hiệu hoá' : 'Kích hoạt'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <section style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý người dùng
            </Title>
            <Text type="secondary">Quản lý tài khoản admin và khách hàng trong hệ thống.</Text>
          </div>
          <Button type="primary" icon={<ReloadOutlined />}>
            Tải lại
          </Button>
        </div>

        <Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <Input
                placeholder="Tìm tên, email, số điện thoại"
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                value={roleFilter}
                options={roleOptions}
                onChange={(value) => setRoleFilter(value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                value={statusFilter}
                options={statusOptions}
                onChange={(value) => setStatusFilter(value)}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Table<UserRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredUsers}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: 'Không tìm thấy người dùng phù hợp' }}
          />
        </Card>
      </Space>
    </section>
  )
}

export default ManageUser
