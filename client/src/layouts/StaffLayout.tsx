import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Layout,
  Menu,
  Button,
  theme,
  Avatar,
  Space,
  Typography,
  Dropdown,
  Tag,
} from "antd";
import type { MenuProps } from "antd";
import {
  HomeOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  QrcodeOutlined,
  UnorderedListOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../features/auth/auth.store";
import { toast } from "react-toastify";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

function StaffLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    clearAuth();
    toast.success("Đã đăng xuất tài khoản");
    navigate("/signIn");
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "/staff",
      icon: <DashboardOutlined style={{ fontSize: 18 }} />,
      label: "Tổng Quan Ca Làm",
    },
    {
      key: "/staff/pos",
      icon: <ShoppingOutlined style={{ fontSize: 18 }} />,
      label: "Bán Vé Quầy (POS)",
    },
    {
      key: "/staff/checkin",
      icon: <QrcodeOutlined style={{ fontSize: 18 }} />,
      label: "Soát Vé & Quét Mã QR",
    },
    {
      key: "/staff/bookings",
      icon: <UnorderedListOutlined style={{ fontSize: 18 }} />,
      label: "Tra Cứu Đơn Hàng",
    },
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
          overflow: "auto",
          height: "100vh",
          position: "sticky",
          left: 0,
          top: 0,
          bottom: 0,
          background: "#0f172a",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 16px",
            background: "rgba(255, 255, 255, 0.05)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #b91c1c, #db6464ff)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: 20,
              boxShadow: "0 2px 8px rgba(149, 76, 136, 0.4)",
            }}
          >
            S
          </div>
          {!collapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  lineHeight: 1.2,
                }}
              >
                LUMORA POS
              </span>
              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
                Hệ thống Nhân viên
              </span>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            padding: "16px 8px",
            background: "transparent",
            borderRight: 0,
          }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.06)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size="large">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 48, height: 48 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={4} style={{ margin: 0, color: "#1e293b" }}>
                Giao Diện Vận Hành Rạp
              </Title>
              <Tag color="red" icon={<SafetyCertificateOutlined />}>
                Ca Trực POS
              </Tag>
            </div>
          </Space>

          <Space size="middle">
            <Button
              type="default"
              icon={<HomeOutlined />}
              onClick={() => navigate("/")}
            >
              Về trang khách hàng
            </Button>

            <Dropdown
              menu={{
                items: [
                  {
                    key: "profile",
                    icon: <UserOutlined />,
                    label: "Hồ sơ cá nhân",
                    onClick: () => navigate(`/profile/${user?._id}`),
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "Đăng xuất ca làm",
                    danger: true,
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: "pointer", padding: "4px 8px" }}>
                <Avatar
                  style={{ backgroundColor: "#b91c1c" }}
                  icon={<UserOutlined />}
                  src={user?.avatar}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <Text strong style={{ lineHeight: 1.2 }}>
                    {user?.fullName || "Staff Lumora"}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user?.role === "admin" ? "Admin / Staff" : "Nhân viên quầy"}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: "20px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default StaffLayout;
