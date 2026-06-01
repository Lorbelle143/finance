import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type NavItem = {
  label: string;
  icon: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "🏠", path: "/dashboard" },
  { label: "Charts",    icon: "📊", path: "/charts" },
  { label: "Statistics",icon: "📈", path: "/statistics" },
  { label: "Earnings",  icon: "💰", path: "/earnings" },
  { label: "Settings",  icon: "⚙️",  path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">InventoryFin</div>
        <div className="sidebar-brand-sub">Financial Management</div>
      </div>

      <div className="sidebar-profile">
        <div className="avatar">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="sidebar-profile-info">
          <div className="sidebar-profile-name">{user?.name || "User"}</div>
          <div className="sidebar-profile-email">{user?.email || ""}</div>
        </div>
      </div>

      <div className="sidebar-section-label">Menu</div>

      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`nav-item${location.pathname === item.path ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="nav-item"
          onClick={() => { logout(); navigate("/"); }}
        >
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
