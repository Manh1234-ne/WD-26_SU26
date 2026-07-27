import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, theme, Avatar, Space, Typography, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  HomeOutlined,
  DashboardOutlined,
  VideoCameraOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  FieldTimeOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  LogoutOutlined,
  GiftOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems: MenuProps["items"] = [
    { key: "/admin", icon: <DashboardOutlined />, label: "Tổng Quát" },
    { key: "/admin/movies", icon: <VideoCameraOutlined />, label: "Quản lý phim" },
    { key: "/admin/rooms", icon: <ApartmentOutlined />, label: "Quản lý phòng chiếu" },
    { key: "/admin/showtimes", icon: <FieldTimeOutlined />, label: "Quản lý lịch chiếu" },
    { key: "/admin/seats", icon: <AppstoreOutlined />, label: "Quản lý sơ đồ ghế" },
    { key: "/admin/bookings", icon: <VideoCameraOutlined />, label: "Quản lý đặt vé" },
    { key: "/admin/users", icon: <UserOutlined />, label: "Quản lý người dùng" },
    { key: "/admin/vouchers", icon: <GiftOutlined />, label: "Quản lý voucher" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={260}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ 
          height: 64, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          gap: 12,
          padding: 16,
          background: "rgba(255, 255, 255, 0.04)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            background: "#e11d48", 
            borderRadius: 8, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "white", 
            fontWeight: "bold",
            fontSize: 18
          }}>L</div>
          {!collapsed && (
            <span style={{ color: "white", fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>Lumora</span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ padding: "12px 8px", borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: "0 24px", 
          background: colorBgContainer, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.05)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <Space size="large">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: 64, marginLeft: -24 }}
            />
            {!collapsed && <Title level={4} style={{ margin: 0 }}>Bảng điều khiển Admin</Title>}
          </Space>
          
          <Space size="middle">
            <Button 
              type="primary" 
              icon={<HomeOutlined />} 
              onClick={() => navigate("/")}
              ghost
            >
              Về trang chủ
            </Button>
            <Dropdown menu={{ items: [
                { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
              ] }} placement="bottomRight">
              <Space style={{ cursor: "pointer", padding: "0 12px" }}>
                <Avatar style={{ backgroundColor: "#e11d48" }} icon={<UserOutlined />} />
                <Text strong>Admin</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;