import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import { FRAME_STATUS } from "../../config/firebaseCollections";
import { getAllCustomFrames } from "../../services/customFrameService";
import "../../styles/admin.css";
import {
  FileImage,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Heart,
  Clock,
} from "lucide-react";

export default function AdminFrames() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [frames, setFrames] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch frames (Firebase or LocalStorage custom frames)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Load custom frames from localStorage
      const customFrames = getAllCustomFrames(true); // includeAll = true for admin
      setFrames(customFrames);

      // Calculate stats from custom frames
      const statsData = {
        total: customFrames.length,
        pending: customFrames.filter((f) => f.status === "PENDING_REVIEW")
          .length,
        approved: customFrames.filter((f) => f.status === "APPROVED").length,
        rejected: customFrames.filter((f) => f.status === "REJECTED").length,
        draft: customFrames.filter((f) => f.status === "DRAFT").length,
      };
      setStats(statsData);
      return;
    }

    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    if (!isFirebaseConfigured) return;

    setLoading(true);

    try {
      const { getAllFrames, getFrameStats } = await import(
        "../../services/frameManagementService"
      );

      const statusFilter = filterStatus === "all" ? null : filterStatus;
      const [framesData, statsData] = await Promise.all([
        getAllFrames(statusFilter),
        getFrameStats(),
      ]);

      setFrames(framesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching frames:", error);
    }

    setLoading(false);
  };

  const handleApprove = async (frameId) => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    if (
      !window.confirm("Approve this frame and publish it to the marketplace?")
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { approveFrame } = await import(
        "../../services/frameManagementService"
      );
      const result = await approveFrame(frameId, currentUser.uid);

      if (result.success) {
        alert("Frame approved and published!");
        fetchData();
      } else {
        alert(result.message || "Failed to approve frame");
      }
    } catch (error) {
      console.error("Error approving frame:", error);
      alert("Failed to approve frame");
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    setProcessing(true);

    try {
      const { rejectFrame } = await import(
        "../../services/frameManagementService"
      );
      const result = await rejectFrame(
        selectedFrame.id,
        currentUser.uid,
        feedback
      );

      if (result.success) {
        alert("Frame rejected");
        setShowRejectModal(false);
        setFeedback("");
        setSelectedFrame(null);
        fetchData();
      } else {
        alert(result.message || "Failed to reject frame");
      }
    } catch (error) {
      console.error("Error rejecting frame:", error);
      alert("Failed to reject frame");
    }

    setProcessing(false);
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      alert("Please provide feedback for changes");
      return;
    }

    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    setProcessing(true);

    try {
      const { requestFrameChanges } = await import(
        "../../services/frameManagementService"
      );
      const result = await requestFrameChanges(
        selectedFrame.id,
        currentUser.uid,
        feedback
      );

      if (result.success) {
        alert("Change request sent to kreator");
        setShowChangesModal(false);
        setFeedback("");
        setSelectedFrame(null);
        fetchData();
      } else {
        alert(result.message || "Failed to request changes");
      }
    } catch (error) {
      console.error("Error requesting changes:", error);
      alert("Failed to request changes");
    }

    setProcessing(false);
  };

  const openRejectModal = (frame) => {
    setSelectedFrame(frame);
    setShowRejectModal(true);
  };

  const openChangesModal = (frame) => {
    setSelectedFrame(frame);
    setShowChangesModal(true);
  };

  const closeModals = () => {
    setShowRejectModal(false);
    setShowChangesModal(false);
    setFeedback("");
    setSelectedFrame(null);
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
          <p style={{ color: "var(--text-secondary)" }}>Loading frames...</p>
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
        {/* Firebase Warning Banner */}
        {!isFirebaseConfigured && (
          <div className="admin-alert">
            <AlertCircle size={24} className="admin-alert-icon" />
            <div>
              <h3 className="admin-alert-title">
                LocalStorage Mode - UI Preview Only
              </h3>
              <p className="admin-alert-message">
                Firebase is not configured. Frames list and actions are
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
            Frame Management
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
            Review and manage community-submitted frames
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <StatCard title="Total" value={stats.total} color="#3b82f6" />
          <StatCard title="Pending" value={stats.pending} color="#f59e0b" />
          <StatCard title="Approved" value={stats.approved} color="#10b981" />
          <StatCard title="Rejected" value={stats.rejected} color="#ef4444" />
          <StatCard title="Draft" value={stats.draft} color="#6b7280" />
        </div>

        {/* Filter Tabs */}
        <div
          className="admin-card"
          style={{
            padding: "12px",
            marginBottom: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <FilterButton
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            label="All"
            count={stats.total}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.PENDING_REVIEW}
            onClick={() => setFilterStatus(FRAME_STATUS.PENDING_REVIEW)}
            label="Pending Review"
            count={stats.pending}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.APPROVED}
            onClick={() => setFilterStatus(FRAME_STATUS.APPROVED)}
            label="Approved"
            count={stats.approved}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.REJECTED}
            onClick={() => setFilterStatus(FRAME_STATUS.REJECTED)}
            label="Rejected"
            count={stats.rejected}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.DRAFT}
            onClick={() => setFilterStatus(FRAME_STATUS.DRAFT)}
            label="Draft"
            count={stats.draft}
          />
        </div>

        {/* Frames Grid */}
        {frames.length === 0 ? (
          <div
            className="admin-card"
            style={{
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <FileImage
              size={48}
              style={{ margin: "0 auto 16px", color: "var(--text-secondary)" }}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
              No frames found
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {frames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                onApprove={handleApprove}
                onReject={openRejectModal}
                onRequestChanges={openChangesModal}
                processing={processing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <FeedbackModal
          title="Reject Frame"
          frame={selectedFrame}
          feedback={feedback}
          setFeedback={setFeedback}
          onConfirm={handleReject}
          onCancel={closeModals}
          processing={processing}
          buttonLabel="Reject Frame"
          buttonColor="bg-red-600 hover:bg-red-700"
          placeholder="Explain why this frame is being rejected..."
        />
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <FeedbackModal
          title="Request Changes"
          frame={selectedFrame}
          feedback={feedback}
          setFeedback={setFeedback}
          onConfirm={handleRequestChanges}
          onCancel={closeModals}
          processing={processing}
          buttonLabel="Send Feedback"
          buttonColor="bg-orange-600 hover:bg-orange-700"
          placeholder="Describe what changes are needed..."
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, color }) {
  return (
    <div className="admin-card" style={{ padding: "20px" }}>
      <div
        style={{
          backgroundColor: color,
          color: "white",
          padding: "10px",
          borderRadius: "10px",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "12px",
        }}
      >
        <FileImage size={20} />
      </div>
      <p
        style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "#2d1b14",
          marginBottom: "6px",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "#8b7064",
          fontWeight: "500",
        }}
      >
        {title}
      </p>
    </div>
  );
}

// Filter Button
function FilterButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: "10px",
        fontWeight: "600",
        fontSize: "14px",
        transition: "all 0.3s ease",
        border: "none",
        cursor: "pointer",
        backgroundColor: active ? "#e0b7a9" : "transparent",
        color: active ? "white" : "#8b7064",
        boxShadow: active ? "0 4px 8px rgba(224, 183, 169, 0.3)" : "none",
        transform: active ? "translateY(-1px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "#faf6f5";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      {label} ({count})
    </button>
  );
}

// Frame Card Component
function FrameCard({
  frame,
  onApprove,
  onReject,
  onRequestChanges,
  processing,
}) {
  const getStatusBadge = (status) => {
    const configs = {
      [FRAME_STATUS.DRAFT]: {
        className: "admin-badge-secondary",
        label: "Draft",
        icon: <Clock size={14} />,
      },
      [FRAME_STATUS.PENDING_REVIEW]: {
        className: "admin-badge-warning",
        label: "Pending",
        icon: <Clock size={14} />,
      },
      [FRAME_STATUS.APPROVED]: {
        className: "admin-badge-success",
        label: "Approved",
        icon: <CheckCircle size={14} />,
      },
      [FRAME_STATUS.REJECTED]: {
        className: "admin-badge-danger",
        label: "Rejected",
        icon: <XCircle size={14} />,
      },
      [FRAME_STATUS.REQUEST_CHANGES]: {
        className: "admin-badge-warning",
        label: "Changes Requested",
        icon: <AlertCircle size={14} />,
      },
    };
    const config = configs[status] || configs[FRAME_STATUS.DRAFT];
    return (
      <div
        className={config.className}
        style={{ display: "flex", alignItems: "center", gap: "6px" }}
      >
        {config.icon}
        {config.label}
      </div>
    );
  };

  const isPending = frame.status === FRAME_STATUS.PENDING_REVIEW;

  return (
    <div className="admin-card" style={{ padding: "26px" }}>
      <div style={{ display: "flex", gap: "24px" }}>
        {/* Thumbnail */}
        <div
          style={{
            flexShrink: 0,
            width: "200px",
            height: "200px",
            background: "linear-gradient(135deg, #fef3f0 0%, #f7ebe7 100%)",
            borderRadius: "14px",
            overflow: "hidden",
            border: "2px solid var(--border)",
          }}
        >
          {frame.thumbnailUrl ? (
            <img
              src={frame.thumbnailUrl}
              alt={frame.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <FileImage size={48} style={{ color: "#c8b5ae" }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#2d1b14",
                  marginBottom: "6px",
                }}
              >
                {frame.name}
              </h3>
              <p
                style={{
                  color: "#8b7064",
                  marginBottom: "10px",
                  fontSize: "15px",
                }}
              >
                {frame.description || "No description"}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#a89289",
                  fontWeight: "500",
                }}
              >
                Created by:{" "}
                <span style={{ fontWeight: "700", color: "#6d5449" }}>
                  {frame.creatorName || "Unknown"}
                </span>
              </p>
            </div>
            {getStatusBadge(frame.status)}
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              marginBottom: "20px",
              paddingTop: "12px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Eye size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.views || 0} views
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Download size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.uses || 0} uses
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#8b7064",
              }}
            >
              <Heart size={16} />
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                {frame.likes || 0} likes
              </span>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => onApprove(frame.id)}
                disabled={processing}
                className="admin-button-success"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <CheckCircle size={18} />
                Approve
              </button>
              <button
                onClick={() => onRequestChanges(frame)}
                disabled={processing}
                className="admin-button-warning"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <AlertCircle size={18} />
                Request Changes
              </button>
              <button
                onClick={() => onReject(frame)}
                disabled={processing}
                className="admin-button-danger"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Feedback Modal Component
function FeedbackModal({
  title,
  frame,
  feedback,
  setFeedback,
  onConfirm,
  onCancel,
  processing,
  buttonLabel,
  buttonColor,
  placeholder,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        className="admin-card"
        style={{
          maxWidth: "500px",
          width: "100%",
          padding: "30px",
          animation: "slideDown 0.3s ease",
        }}
      >
        <h3
          style={{
            fontSize: "24px",
            fontWeight: "800",
            color: "#2d1b14",
            marginBottom: "16px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: "#8b7064",
            marginBottom: "20px",
            fontSize: "15px",
          }}
        >
          Frame: <strong style={{ color: "#6d5449" }}>{frame.name}</strong>
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="admin-input"
          style={{
            width: "100%",
            resize: "none",
            marginBottom: "20px",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCancel}
            disabled={processing}
            className="admin-button-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing || !feedback.trim()}
            className={
              buttonColor.includes("red")
                ? "admin-button-danger"
                : "admin-button-warning"
            }
            style={{
              flex: 1,
              opacity: processing || !feedback.trim() ? 0.5 : 1,
              cursor:
                processing || !feedback.trim() ? "not-allowed" : "pointer",
            }}
          >
            {processing ? "Processing..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
