import { NavLink, Outlet } from "react-router-dom";
import {
  HomeOutlined,
  DashboardOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

const adminLinks = [
  { to: "/admin", label: "Tổng Quát", end: true, icon: <DashboardOutlined /> },
  { to: "/admin/movies", label: "Quản lý phim", icon: <VideoCameraOutlined /> },
  {
    to: "/admin/bookings",
    label: "Quản lý đặt vé",
    icon: <VideoCameraOutlined />,
  },
  {
    to: "/admin/users",
    label: "Quản lý người dùng",
    icon: <VideoCameraOutlined />,
  },
];

function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="brand admin-brand" to="/">
          <span className="brand-mark">L</span>
          <span>Admin</span>
        </NavLink>
        <nav className="admin-nav">
          {adminLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Bảng điều khiển</p>
            <h1>Quản trị Lumora</h1>
          </div>
          <NavLink
            className="secondary-link"
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <HomeOutlined />
            Xem trang chủ
          </NavLink>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
