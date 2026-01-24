import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getAllUsers } from "../../services/userService";
import { isFirebaseConfigured } from "../../config/firebase";
import "../../styles/admin.css";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  Shield,
  User,
  Ban,
  CheckCircle,
  AlertCircle,
  Crown,
  Trash2,
  Edit,
  ArrowLeft,
  RefreshCw,
  Copy,
  Download,
  Plus,
} from "lucide-react";

export default function AdminUsers() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [registeredEmails, setRegisteredEmails] = useState([]);
  const [activeTab, setActiveTab] = useState("emails"); // 'emails' or 'users'
  const [stats, setStats] = useState({
    total: 0,
    kreators: 0,
    regular: 0,
    active: 0,
    banned: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  // Fetch users and registered emails
  useEffect(() => {
    fetchUsers();
    fetchRegisteredEmails();
  }, []);

  // Fetch registered emails from VPS API
  const fetchRegisteredEmails = async () => {
    try {
      console.log("🔄 Fetching registered users from VPS...");

      const users = await getAllUsers();

      const emails = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.displayName || "Unknown",
        role: "user",
        status: "active",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
      }));

      console.log("✅ Registered emails fetched:", emails.length);
      setRegisteredEmails(emails);
    } catch (error) {
      console.error("❌ Error fetching registered emails:", error);
    }
  };

  // Add user manually (simplified - just adds to localStorage for now)
  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    setAddingUser(true);
    try {
      const emailLower = newUserEmail.trim().toLowerCase();

      // For now, just add to localStorage (VPS doesn't support manual user creation without Firebase)
      const newUser = {
        id: `manual_${Date.now()}`,
        email: emailLower,
        name: newUserName.trim() || newUserEmail.split("@")[0],
        displayName: newUserName.trim() || newUserEmail.split("@")[0],
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
      };

      // Add to local storage list
      const storedUsers = JSON.parse(
        localStorage.getItem("fremio_users") || "[]",
      );
      storedUsers.push(newUser);
      localStorage.setItem("fremio_users", JSON.stringify(storedUsers));

      console.log("✅ User added manually:", newUserEmail);
      alert(`User ${newUserEmail} added successfully!`);

      // Reset and refresh
      setNewUserEmail("");
      setNewUserName("");
      setShowAddUserModal(false);
      fetchRegisteredEmails();
      fetchUsers();
    } catch (error) {
      console.error("❌ Error adding user:", error);
      alert("Failed to add user: " + error.message);
    }
    setAddingUser(false);
  };
  // Filter users based on search and filters
  useEffect(() => {
    let result = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.phone?.toLowerCase().includes(query),
      );
    }

    // Role filter
    if (filterRole !== "all") {
      result = result.filter((user) => user.role === filterRole);
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((user) => user.status === filterStatus);
    }

    setFilteredUsers(result);
  }, [searchQuery, filterRole, filterStatus, users]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      console.log("🔄 AdminUsers - Fetching users...");
      const { getAllUsers } = await import("../../services/userService");
      const usersData = await getAllUsers();

      console.log("✅ Users fetched:", usersData.length);

      setUsers(usersData);
      setFilteredUsers(usersData);

      // Calculate stats from users data
      const statsData = {
        total: usersData.length,
        kreators: usersData.filter((u) => u.role === "kreator").length,
        regular: usersData.filter((u) => u.role === "user").length,
        active: usersData.filter((u) => u.status === "active").length,
        banned: usersData.filter((u) => u.status === "banned").length,
      };

      console.log("✅ Stats calculated:", statsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }

    setLoading(false);
  };

  const handleInitializeCurrentUser = async () => {
    try {
      console.log("🔄 Initializing current user...");
      const { saveUserToStorage } = await import("../../services/userService");

      if (!currentUser) {
        alert("No user logged in!");
        return;
      }

      const result = saveUserToStorage({
        id: currentUser.uid,
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email?.split("@")[0],
        displayName: currentUser.displayName,
        role: currentUser.role || "admin",
        status: "active",
        createdAt: new Date().toISOString(),
      });

      console.log("✅ User initialized:", result);
      alert("Current user initialized successfully!");
      fetchUsers();
    } catch (error) {
      console.error("Error initializing user:", error);
      alert("Failed to initialize user");
    }
  };

  const handlePromoteToKreator = async (userId) => {
    if (
      !window.confirm(
        "Promote this user to Kreator? They will be able to create and submit frames.",
      )
    ) {
      return;
    }

    try {
      const { updateUserRole } = await import("../../services/userService");
      const result = await updateUserRole(userId, "kreator", currentUser.uid);

      if (result.success) {
        alert("User promoted to Kreator!");
        fetchUsers();
      } else {
        alert(result.message || "Failed to promote user");
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      alert("Failed to promote user");
    }
  };

  const handleBanUser = async (userId) => {
    if (
      !window.confirm(
        "Ban this user? They will not be able to access the platform.",
      )
    ) {
      return;
    }

    try {
      const { banUser } = await import("../../services/userService");
      const result = await banUser(userId, currentUser.uid, "Banned by admin");

      if (result.success) {
        alert("User banned!");
        fetchUsers();
      } else {
        alert(result.message || "Failed to ban user");
      }
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId) => {
    if (
      !window.confirm(
        "Unban this user? They will be able to access the platform again.",
      )
    ) {
      return;
    }

    try {
      const { unbanUser } = await import("../../services/userService");
      const result = await unbanUser(userId, currentUser.uid);

      if (result.success) {
        alert("User unbanned!");
        fetchUsers();
      } else {
        alert(result.message || "Failed to unban user");
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      alert("Failed to unban user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !window.confirm(
        "Delete this user permanently? This action cannot be undone. All their data will be deleted.",
      )
    ) {
      return;
    }

    try {
      const { deleteUser } = await import("../../services/userService");
      const result = await deleteUser(userId, currentUser.uid);

      if (result.success) {
        alert("User deleted!");
        fetchUsers();
      } else {
        alert(result.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid #f3f4f6",
              borderTop: "4px solid var(--accent)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          ></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #fdf7f4 0%, #fff 50%, #f7f1ed 100%)",
        minHeight: "100vh",
        padding: "32px 0 48px",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 16px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin")}
          className="admin-button-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            padding: "10px 16px",
          }}
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </button>

        {/* Firebase Warning Banner */}
        {!isFirebaseConfigured && (
          <div className="admin-alert">
            <AlertCircle size={24} className="admin-alert-icon" />
            <div>
              <h3 className="admin-alert-title">
                LocalStorage Mode - UI Preview Only
              </h3>
              <p className="admin-alert-message">
                Firebase is not configured. User management features are
                disabled. Setup Firebase to enable full functionality.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 34px)",
              fontWeight: "800",
              color: "#222",
              margin: "0 0 8px",
            }}
          >
            User Management
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            Manage users, roles, and permissions
          </p>
        </div>

        {/* Stats Cards */}
        <div
          className="admin-stats-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginBottom: "32px",
          }}
        >
          <StatCard
            title="Registered Emails"
            value={registeredEmails.length}
            icon={<Mail size={20} />}
            color="#8b5cf6"
          />
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={<Users size={20} />}
            color="#3b82f6"
          />
          <StatCard
            title="Kreators"
            value={stats.kreators}
            icon={<Crown size={20} />}
            color="#f59e0b"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle size={20} />}
            color="#06b6d4"
          />
          <StatCard
            title="Banned"
            value={stats.banned}
            icon={<Ban size={20} />}
            color="#ef4444"
          />
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: "0",
          }}
        >
          <button
            onClick={() => setActiveTab("emails")}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              background: activeTab === "emails" ? "#8b5cf6" : "transparent",
              color: activeTab === "emails" ? "white" : "#6b7280",
              border: "none",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "-2px",
              borderBottom:
                activeTab === "emails"
                  ? "2px solid #8b5cf6"
                  : "2px solid transparent",
            }}
          >
            <Mail size={16} />
            Registered Emails ({registeredEmails.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              background: activeTab === "users" ? "#3b82f6" : "transparent",
              color: activeTab === "users" ? "white" : "#6b7280",
              border: "none",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "-2px",
              borderBottom:
                activeTab === "users"
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
            }}
          >
            <Users size={16} />
            User Management ({stats.total})
          </button>
        </div>

        {/* Registered Emails Tab */}
        {activeTab === "emails" && (
          <div className="admin-card" style={{ marginBottom: "24px" }}>
            <div
              className="admin-card-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Mail size={20} color="#8b5cf6" />
                Registered Email List
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    fetchRegisteredEmails();
                    fetchUsers();
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "500",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    const emailList = registeredEmails
                      .map((u) => u.email)
                      .join("\n");
                    navigator.clipboard.writeText(emailList);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "500",
                    background: copySuccess ? "#10b981" : "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Copy size={14} />
                  {copySuccess ? "Copied!" : "Copy All Emails"}
                </button>
                <button
                  onClick={() => {
                    const csvContent =
                      "Email,Name,Role,Status,Registered At\n" +
                      registeredEmails
                        .map(
                          (u) =>
                            `${u.email},${u.name},${u.role},${u.status},${u.createdAt || "N/A"}`,
                        )
                        .join("\n");
                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `registered-emails-${new Date().toISOString().split("T")[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "500",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "500",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={14} />
                  Add User
                </button>
              </div>
            </div>
            <div className="admin-card-body">
              {registeredEmails.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 20px",
                    color: "#6b7280",
                  }}
                >
                  <Mail
                    size={48}
                    style={{ marginBottom: "16px", opacity: 0.5 }}
                  />
                  <h4 style={{ margin: "0 0 8px", color: "#374151" }}>
                    No Registered Emails Yet
                  </h4>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Users who register or login will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          #
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Email
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Role
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Registered
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredEmails.map((user, index) => (
                        <tr
                          key={user.id}
                          style={{
                            borderBottom: "1px solid #f3f4f6",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f9fafb")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            style={{ padding: "12px 16px", color: "#6b7280" }}
                          >
                            {index + 1}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <Mail size={14} color="#8b5cf6" />
                              <span style={{ fontWeight: "500" }}>
                                {user.email}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: "#374151" }}
                          >
                            {user.name}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "500",
                                background:
                                  user.role === "admin"
                                    ? "#fef2f2"
                                    : user.role === "kreator"
                                      ? "#fef3c7"
                                      : "#f3f4f6",
                                color:
                                  user.role === "admin"
                                    ? "#dc2626"
                                    : user.role === "kreator"
                                      ? "#d97706"
                                      : "#6b7280",
                              }}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "500",
                                background:
                                  user.status === "active"
                                    ? "#d1fae5"
                                    : "#fee2e2",
                                color:
                                  user.status === "active"
                                    ? "#059669"
                                    : "#dc2626",
                              }}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#6b7280",
                              fontSize: "13px",
                            }}
                          >
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab - Search and Filters */}
        {activeTab === "users" && (
          <>
            <div className="admin-card" style={{ marginBottom: "24px" }}>
              <div className="admin-card-body">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  {/* Search */}
                  <div style={{ position: "relative" }}>
                    <Search
                      size={18}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-secondary)",
                      }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or phone..."
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 40px",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="admin-select"
                    style={{ width: "160px" }}
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="kreator">Kreator</option>
                    <option value="user">User</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="admin-select"
                    style={{ width: "160px" }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="admin-card">
                <div
                  className="admin-card-body"
                  style={{ textAlign: "center", padding: "48px 24px" }}
                >
                  <Users
                    size={48}
                    style={{ color: "#d1d5db", margin: "0 auto 16px" }}
                  />
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      marginBottom: "16px",
                    }}
                  >
                    No users found
                  </p>

                  {/* Debug Info */}
                  <div
                    style={{
                      background: "#f0f9ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "16px",
                      textAlign: "left",
                      fontSize: "13px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontWeight: "600",
                        color: "#1e40af",
                      }}
                    >
                      🔍 Debug Info:
                    </p>
                    <p style={{ margin: "4px 0", color: "#1e3a8a" }}>
                      Total users in state: {users.length}
                    </p>
                    <p style={{ margin: "4px 0", color: "#1e3a8a" }}>
                      Filtered users: {filteredUsers.length}
                    </p>
                    <p style={{ margin: "4px 0", color: "#1e3a8a" }}>
                      Current user: {currentUser?.email || "Not logged in"}
                    </p>
                    <p
                      style={{
                        margin: "4px 0",
                        color: "#1e3a8a",
                        fontSize: "11px",
                      }}
                    >
                      Check browser console (F12) for detailed logs
                    </p>
                  </div>

                  {/* Initialize Button */}
                  <button
                    onClick={handleInitializeCurrentUser}
                    style={{
                      padding: "12px 24px",
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(59, 130, 246, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <Shield size={16} />
                    Initialize Current User as Admin
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUser?.uid}
                    onPromoteToKreator={handlePromoteToKreator}
                    onBan={handleBanUser}
                    onUnban={handleUnbanUser}
                    onDelete={handleDeleteUser}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            onClick={() => setShowAddUserModal(false)}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "400px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  margin: "0 0 20px",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                Add Registered User
              </h3>
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Manually add an email to the registered users list.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="User Name"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setShowAddUserModal(false)}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserEmail.trim()}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    background: addingUser ? "#9ca3af" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: addingUser ? "not-allowed" : "pointer",
                  }}
                >
                  {addingUser ? "Adding..." : "Add User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }) {
  return (
    <div className="admin-card">
      <div className="admin-card-body" style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              background: color,
              color: "white",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        </div>
        <p className="admin-stat-value" style={{ color: color }}>
          {value}
        </p>
        <p className="admin-stat-label">{title}</p>
      </div>
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  currentUserId,
  onPromoteToKreator,
  onBan,
  onUnban,
  onDelete,
}) {
  const isCurrentUser = user.id === currentUserId;
  const isBanned = user.status === "banned";

  const getRoleBadge = (role) => {
    const configs = {
      admin: { color: "#dc2626", label: "Admin", icon: <Shield size={12} /> },
      kreator: {
        color: "#f59e0b",
        label: "Kreator",
        icon: <Crown size={12} />,
      },
      user: { color: "#6b7280", label: "User", icon: <User size={12} /> },
    };
    const config = configs[role] || configs.user;
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: "600",
          background: `${config.color}20`,
          color: config.color,
        }}
      >
        {config.icon}
        {config.label}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    if (status === "banned") {
      return <span className="admin-badge admin-badge-danger">Banned</span>;
    }
    return <span className="admin-badge admin-badge-success">Active</span>;
  };

  return (
    <div className="admin-card">
      <div className="admin-card-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "20px",
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "800",
              fontSize: "20px",
            }}
          >
            {(user.name || user.email)?.[0]?.toUpperCase() || "U"}
          </div>

          {/* User Info */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#222",
                  margin: 0,
                }}
              >
                {user.name || "Unknown User"}
                {isCurrentUser && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    (You)
                  </span>
                )}
              </h3>
              {getRoleBadge(user.role)}
              {getStatusBadge(user.status)}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                fontSize: "13px",
                color: "var(--text-secondary)",
              }}
            >
              {user.email && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Phone size={14} />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.createdAt && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Calendar size={14} />
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isCurrentUser && (
            <div style={{ display: "flex", gap: "8px" }}>
              {user.role === "user" && !isBanned && (
                <button
                  onClick={() => onPromoteToKreator(user.id)}
                  style={{
                    padding: "8px 12px",
                    background: "#fef3c7",
                    border: "1px solid #fde047",
                    borderRadius: "8px",
                    color: "#92400e",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Promote to Kreator"
                >
                  <Crown size={14} />
                  Promote
                </button>
              )}
              {isBanned ? (
                <button
                  onClick={() => onUnban(user.id)}
                  style={{
                    padding: "8px 12px",
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    color: "#166534",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Unban User"
                >
                  <CheckCircle size={14} />
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => onBan(user.id)}
                  style={{
                    padding: "8px 12px",
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    color: "#991b1b",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Ban User"
                >
                  <Ban size={14} />
                  Ban
                </button>
              )}
              <button
                onClick={() => onDelete(user.id)}
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fdd8d8",
                  borderRadius: "8px",
                  color: "#b42318",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Delete User"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
