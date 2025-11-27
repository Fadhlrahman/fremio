import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import {
  getAllContactMessages,
  updateMessageStatus,
  replyToMessage,
  deleteContactMessage,
  getTopicLabel,
  getStatusColor,
  getPriorityColor,
} from "../../services/contactMessageService";
import {
  Mail,
  MailOpen,
  Clock,
  Trash2,
  Send,
  X,
  Filter,
  Search,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function AdminMessages() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load messages
  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getAllContactMessages();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
      showToast("Gagal memuat pesan", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Mark as read when opening
  const handleOpenMessage = async (message) => {
    setSelectedMessage(message);
    if (message.status === "new") {
      try {
        await updateMessageStatus(message.id, "read");
        loadMessages();
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      showToast("Reply tidak boleh kosong", "error");
      return;
    }

    try {
      await replyToMessage(selectedMessage.id, replyText, currentUser?.uid);
      showToast("Reply berhasil dikirim!", "success");
      setReplyText("");
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Error sending reply:", error);
      showToast("Gagal mengirim reply", "error");
    }
  };

  // Delete message
  const handleDelete = async (messageId) => {
    if (!confirm("Hapus pesan ini?")) return;

    try {
      await deleteContactMessage(messageId);
      showToast("Pesan berhasil dihapus", "success");
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      showToast("Gagal menghapus pesan", "error");
    }
  };

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    const matchStatus = filterStatus === "all" || msg.status === filterStatus;
    const matchTopic = filterTopic === "all" || msg.topic === filterTopic;
    const matchSearch =
      searchQuery === "" ||
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchTopic && matchSearch;
  });

  // Get stats
  const stats = {
    total: messages.length,
    new: messages.filter((m) => m.status === "new").length,
    read: messages.filter((m) => m.status === "read").length,
    replied: messages.filter((m) => m.status === "replied").length,
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              border: "4px solid #e2e8f0",
              borderTopColor: "#e0b7a9",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: "16px", color: "#64748b" }}>
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            padding: "10px 16px",
            backgroundColor: "#fff",
            border: "2px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fff";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </button>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "800",
              color: "#111",
              marginBottom: "8px",
            }}
          >
            📧 Contact Messages
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            Kelola pesan dari pengguna melalui Call Center
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            label="Total Pesan"
            value={stats.total}
            color="#3b82f6"
            icon={<Mail size={20} />}
          />
          <StatCard
            label="Pesan Baru"
            value={stats.new}
            color="#ef4444"
            icon={<AlertCircle size={20} />}
          />
          <StatCard
            label="Sudah Dibaca"
            value={stats.read}
            color="#f59e0b"
            icon={<MailOpen size={20} />}
          />
          <StatCard
            label="Sudah Dibalas"
            value={stats.replied}
            color="#10b981"
            icon={<Send size={20} />}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 450px",
            gap: "24px",
          }}
        >
          {/* Messages List */}
          <div>
            {/* Filters */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 200px",
                  gap: "12px",
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
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Cari nama, email, atau pesan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px 10px 40px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="all">Semua Status</option>
                  <option value="new">Baru</option>
                  <option value="read">Sudah Dibaca</option>
                  <option value="replied">Sudah Dibalas</option>
                  <option value="closed">Ditutup</option>
                </select>

                {/* Topic Filter */}
                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="all">Semua Topik</option>
                  <option value="technical">Technical Support</option>
                  <option value="account">Account Issues</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="general">General Inquiry</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {filteredMessages.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    padding: "60px 20px",
                    borderRadius: "12px",
                    border: "2px solid #e2e8f0",
                    textAlign: "center",
                  }}
                >
                  <Mail
                    size={48}
                    style={{ color: "#cbd5e1", margin: "0 auto 16px" }}
                  />
                  <p style={{ color: "#64748b", fontSize: "1rem" }}>
                    Tidak ada pesan yang ditemukan
                  </p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onOpen={() => handleOpenMessage(message)}
                    onDelete={() => handleDelete(message.id)}
                    isSelected={selectedMessage?.id === message.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Message Detail / Reply Panel */}
          <div style={{ position: "sticky", top: "20px" }}>
            {selectedMessage ? (
              <div
                style={{
                  background: "white",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "20px",
                    borderBottom: "2px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      color: "#111",
                    }}
                  >
                    Detail Pesan
                  </h3>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "4px",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: "20px" }}>
                  {/* Sender Info */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        color: "#111",
                        marginBottom: "8px",
                      }}
                    >
                      {selectedMessage.name}
                    </h4>
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "0.9rem",
                        marginBottom: "4px",
                      }}
                    >
                      📧 {selectedMessage.email}
                    </p>
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "0.9rem",
                        marginBottom: "12px",
                      }}
                    >
                      📱 {selectedMessage.phone}
                    </p>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <StatusBadge status={selectedMessage.status} />
                      <PriorityBadge priority={selectedMessage.priority} />
                      <span
                        style={{
                          padding: "4px 12px",
                          background: "#f1f5f9",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          color: "#475569",
                        }}
                      >
                        {getTopicLabel(selectedMessage.topic)}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: "20px" }}>
                    <h5
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#64748b",
                        marginBottom: "8px",
                      }}
                    >
                      Pesan:
                    </h5>
                    <div
                      style={{
                        background: "#f8f9fa",
                        padding: "16px",
                        borderRadius: "8px",
                        color: "#334155",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Existing Reply */}
                  {selectedMessage.reply && (
                    <div style={{ marginBottom: "20px" }}>
                      <h5
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          color: "#64748b",
                          marginBottom: "8px",
                        }}
                      >
                        Balasan:
                      </h5>
                      <div
                        style={{
                          background: "#e7f5ff",
                          padding: "16px",
                          borderRadius: "8px",
                          borderLeft: "4px solid #3b82f6",
                          color: "#334155",
                          lineHeight: "1.6",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {selectedMessage.reply}
                      </div>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          marginTop: "8px",
                        }}
                      >
                        ✅ Dibalas pada {formatDate(selectedMessage.repliedAt)}
                      </p>
                    </div>
                  )}

                  {/* Reply Form */}
                  {selectedMessage.status !== "replied" &&
                    selectedMessage.status !== "closed" && (
                      <div>
                        <h5
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "#64748b",
                            marginBottom: "8px",
                          }}
                        >
                          Balas Pesan:
                        </h5>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Tulis balasan Anda di sini..."
                          rows="5"
                          style={{
                            width: "100%",
                            padding: "12px",
                            border: "2px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "0.95rem",
                            resize: "vertical",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          onClick={handleSendReply}
                          style={{
                            marginTop: "12px",
                            width: "100%",
                            padding: "12px",
                            background:
                              "linear-gradient(135deg, #e0b7a9 0%, #c89585 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "1rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <Send size={18} />
                          Kirim Balasan
                        </button>
                      </div>
                    )}

                  {/* Timestamp */}
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "20px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Clock size={14} />
                      {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "white",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "60px 20px",
                  textAlign: "center",
                }}
              >
                <Mail
                  size={48}
                  style={{ color: "#cbd5e1", margin: "0 auto 16px" }}
                />
                <p style={{ color: "#64748b" }}>
                  Pilih pesan untuk melihat detail
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        border: "2px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
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
        <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>
          {label}
        </p>
      </div>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: "800",
          color: "#111",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// Message Card Component
function MessageCard({ message, onOpen, onDelete, isSelected }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: isSelected ? "#fff5f2" : "white",
        padding: "16px 20px",
        borderRadius: "12px",
        border: `2px solid ${isSelected ? "#e0b7a9" : "#e2e8f0"}`,
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "#cbd5e1";
          e.currentTarget.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8px",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            {message.status === "new" && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  background: "#ef4444",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
            )}
            <h4
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: "#111",
                margin: 0,
              }}
            >
              {message.name}
            </h4>
          </div>
          <p
            style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 8px" }}
          >
            {message.email}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#ef4444",
            padding: "4px",
          }}
          title="Hapus pesan"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <p
        style={{
          fontSize: "0.9rem",
          color: "#334155",
          margin: "0 0 12px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {message.message}
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <StatusBadge status={message.status} />
        <PriorityBadge priority={message.priority} />
        <span
          style={{
            padding: "4px 10px",
            background: "#f1f5f9",
            borderRadius: "20px",
            fontSize: "0.75rem",
            color: "#475569",
          }}
        >
          {getTopicLabel(message.topic)}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Clock size={12} />
          {new Date(message.createdAt).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }) {
  const labels = {
    new: "Baru",
    read: "Dibaca",
    replied: "Dibalas",
    closed: "Ditutup",
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        background: getStatusColor(status),
        color: "white",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: "600",
      }}
    >
      {labels[status] || status}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }) {
  const labels = {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
  };

  return (
    <span
      style={{
        padding: "4px 10px",
        background: getPriorityColor(priority),
        color: "white",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: "600",
      }}
    >
      {labels[priority] || priority}
    </span>
  );
}
