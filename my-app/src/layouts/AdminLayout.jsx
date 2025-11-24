import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUnreadMessagesCount } from "../services/contactMessageService";
import {
  LayoutDashboard,
  FileImage,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Upload,
  Shield,
  FolderOpen,
  BarChart3,
  Mail,
} from "lucide-react";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      const count = await getUnreadMessagesCount();
      setUnreadCount(count);
    };
    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/frames", icon: FileImage, label: "Manage Frames" },
    { path: "/admin/upload-frame", icon: Upload, label: "Upload Frame" },
    { path: "/admin/users", icon: Users, label: "Users" },
    { path: "/admin/categories", icon: FolderOpen, label: "Categories" },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    {
      path: "/admin/messages",
      icon: Mail,
      label: "Messages",
      badge: unreadCount,
    },
    { path: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          left: sidebarOpen ? 0 : "-256px",
          top: 0,
          bottom: 0,
          width: "256px",
          backgroundColor: "white",
          borderRight: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          transition: "left 0.3s ease",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
        className="lg:left-0 lg:static"
      >
        {/* Logo Section */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              F
            </div>
            <div>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: "#111827",
                }}
              >
                Fremio
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Admin Panel
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              padding: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "6px",
              display: "none",
            }}
            className="lg:hidden block"
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "16px 12px",
            overflowY: "auto",
          }}
        >
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                marginBottom: "4px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s",
                background: isActive(item.path)
                  ? "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)"
                  : "transparent",
                color: isActive(item.path) ? "white" : "#374151",
                boxShadow: isActive(item.path)
                  ? "0 2px 4px rgba(0,0,0,0.1)"
                  : "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: isActive(item.path) ? "#ffffff" : "#ef4444",
                    color: isActive(item.path) ? "#ec4899" : "white",
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div
          style={{
            padding: "12px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              padding: "12px",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <Shield size={14} color="#8b5cf6" />
              <span
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  fontWeight: "500",
                }}
              >
                Administrator
              </span>
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name || user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 40,
          }}
          className="lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginLeft: "0",
        }}
        className="lg:ml-0"
      >
        {/* Top Header */}
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              padding: "0 16px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              maxWidth: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  padding: "8px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "none",
                }}
                className="lg:hidden block"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Menu size={20} color="#374151" />
              </button>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#111827",
                  margin: 0,
                }}
              >
                {menuItems.find((item) => item.path === location.pathname)
                  ?.label || "Admin Panel"}
              </h1>
            </div>
            <div
              style={{
                display: "none",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "#f5f3ff",
                borderRadius: "8px",
                border: "1px solid #e9d5ff",
              }}
              className="md:flex"
            >
              <Shield size={16} color="#8b5cf6" />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#7c3aed",
                }}
              >
                {user?.name || "Admin"}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f9fafb",
          }}
        >
          <Outlet />
        </main>

        {/* Footer */}
        <footer
          style={{
            backgroundColor: "white",
            borderTop: "1px solid #e5e7eb",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            <div>© 2024 Fremio Admin Panel</div>
            <div style={{ display: "flex", gap: "16px" }}>
              <a
                href="#"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ec4899")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
              >
                Help
              </a>
              <a
                href="#"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ec4899")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
              >
                Docs
              </a>
              <a
                href="#"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ec4899")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
              >
                Settings
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
