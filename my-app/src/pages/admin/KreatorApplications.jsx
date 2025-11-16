import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isFirebaseConfigured } from "../../config/firebase";
import { APPLICATION_STATUS } from "../../config/firebaseCollections";
import "../../styles/admin.css";
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

export default function KreatorApplications() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch applications (only if Firebase configured)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Show empty state in localStorage mode
      setApplications([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      return;
    }

    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    if (!isFirebaseConfigured) return;

    setLoading(true);

    try {
      const { getAllApplications, getApplicationStats } = await import(
        "../../services/kreatorApplicationService"
      );

      const statusFilter = filterStatus === "all" ? null : filterStatus;
      const [appsData, statsData] = await Promise.all([
        getAllApplications(statusFilter),
        getApplicationStats(),
      ]);

      setApplications(appsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }

    setLoading(false);
  };

  const handleApprove = async (applicationId) => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to approve this application? The user will be promoted to Kreator."
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { approveApplication } = await import(
        "../../services/kreatorApplicationService"
      );
      const result = await approveApplication(applicationId, currentUser.uid);

      if (result.success) {
        alert("Application approved successfully!");
        fetchData(); // Refresh data
      } else {
        alert(result.message || "Failed to approve application");
      }
    } catch (error) {
      console.error("Error approving application:", error);
      alert("Failed to approve application");
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!isFirebaseConfigured) {
      alert("Firebase not configured. This feature requires Firebase setup.");
      return;
    }

    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);

    try {
      const { rejectApplication } = await import(
        "../../services/kreatorApplicationService"
      );
      const result = await rejectApplication(
        selectedApp.id,
        currentUser.uid,
        rejectionReason
      );

      if (result.success) {
        alert("Application rejected");
        setShowRejectModal(false);
        setRejectionReason("");
        setSelectedApp(null);
        fetchData(); // Refresh data
      } else {
        alert(result.message || "Failed to reject application");
      }
    } catch (error) {
      console.error("Error rejecting application:", error);
      alert("Failed to reject application");
    }

    setProcessing(false);
  };

  const openRejectModal = (app) => {
    setSelectedApp(app);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReason("");
    setSelectedApp(null);
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
          <p style={{ color: "var(--text-secondary)" }}>
            Loading applications...
          </p>
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
                Firebase is not configured. Applications list and actions are
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
            Kreator Applications
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            Review and manage kreator applications
          </p>
        </div>

        {/* Stats Cards */}
        <div
          className="admin-stats-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            marginBottom: "32px",
          }}
        >
          <StatCard
            title="Total"
            value={stats.total}
            icon={<Clock size={24} />}
            color="#3b82f6"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Clock size={24} />}
            color="#eab308"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle size={24} />}
            color="#10b981"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircle size={24} />}
            color="#ef4444"
          />
        </div>

        {/* Filter Tabs */}
        <div className="admin-card" style={{ marginBottom: "24px" }}>
          <div
            className="admin-card-body"
            style={{
              padding: "12px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <FilterButton
              active={filterStatus === "all"}
              onClick={() => setFilterStatus("all")}
              label="All"
              count={stats.total}
            />
            <FilterButton
              active={filterStatus === APPLICATION_STATUS.pending}
              onClick={() => setFilterStatus(APPLICATION_STATUS.pending)}
              label="Pending"
              count={stats.pending}
            />
            <FilterButton
              active={filterStatus === APPLICATION_STATUS.approved}
              onClick={() => setFilterStatus(APPLICATION_STATUS.approved)}
              label="Approved"
              count={stats.approved}
            />
            <FilterButton
              active={filterStatus === APPLICATION_STATUS.rejected}
              onClick={() => setFilterStatus(APPLICATION_STATUS.rejected)}
              label="Rejected"
              count={stats.rejected}
            />
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="admin-card">
            <div
              className="admin-card-body"
              style={{ textAlign: "center", padding: "48px 24px" }}
            >
              <AlertCircle
                size={48}
                style={{ color: "#d1d5db", margin: "0 auto 16px" }}
              />
              <p style={{ color: "var(--text-secondary)" }}>
                No applications found
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onApprove={handleApprove}
                onReject={openRejectModal}
                processing={processing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          application={selectedApp}
          reason={rejectionReason}
          setReason={setRejectionReason}
          onConfirm={handleReject}
          onCancel={closeRejectModal}
          processing={processing}
        />
      )}
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
              padding: "10px",
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

// Filter Button Component
function FilterButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: "10px",
        fontWeight: "600",
        fontSize: "14px",
        border: "1px solid",
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent)" : "#ffffff",
        color: active ? "#231f1e" : "var(--text-primary)",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--bg-soft)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#ffffff";
        }
      }}
    >
      {label} <span style={{ marginLeft: "4px" }}>({count})</span>
    </button>
  );
}

// Application Card Component
function ApplicationCard({ application, onApprove, onReject, processing }) {
  const getStatusBadge = (status) => {
    const configs = {
      [APPLICATION_STATUS.pending]: {
        className: "admin-badge admin-badge-warning",
        label: "Pending Review",
      },
      [APPLICATION_STATUS.approved]: {
        className: "admin-badge admin-badge-success",
        label: "Approved",
      },
      [APPLICATION_STATUS.rejected]: {
        className: "admin-badge admin-badge-danger",
        label: "Rejected",
      },
    };

    const config = configs[status] || configs[APPLICATION_STATUS.pending];

    return <span className={config.className}>{config.label}</span>;
  };

  const isPending = application.status === APPLICATION_STATUS.pending;

  return (
    <div className="admin-card">
      <div className="admin-card-body">
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
                fontSize: "18px",
                fontWeight: "700",
                color: "#222",
                margin: "0 0 4px",
              }}
            >
              {application.displayName}
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                margin: "0 0 4px",
              }}
            >
              {application.email}
            </p>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "12px",
                margin: 0,
              }}
            >
              Submitted:{" "}
              {new Date(
                application.submittedAt?.seconds * 1000
              ).toLocaleDateString()}
            </p>
          </div>
          {getStatusBadge(application.status)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <p className="admin-label" style={{ marginBottom: "4px" }}>
              Portfolio
            </p>
            <a
              href={application.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {application.portfolio}
              <ExternalLink size={14} />
            </a>
          </div>

          <div>
            <p className="admin-label" style={{ marginBottom: "4px" }}>
              Motivation
            </p>
            <p
              style={{
                color: "var(--text-primary)",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {application.motivation}
            </p>
          </div>

          <div>
            <p className="admin-label" style={{ marginBottom: "4px" }}>
              Experience
            </p>
            <p
              style={{
                color: "var(--text-primary)",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {application.experience}
            </p>
          </div>

          {application.rejectionReason && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "10px",
                padding: "12px",
              }}
            >
              <p
                className="admin-label"
                style={{ color: "#991b1b", marginBottom: "4px" }}
              >
                Rejection Reason
              </p>
              <p style={{ color: "#991b1b", fontSize: "14px", margin: 0 }}>
                {application.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {isPending && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <button
              onClick={() => onApprove(application.id)}
              disabled={processing}
              style={{
                padding: "12px",
                background: "#10b981",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                !processing && (e.currentTarget.style.background = "#059669")
              }
              onMouseLeave={(e) =>
                !processing && (e.currentTarget.style.background = "#10b981")
              }
            >
              <CheckCircle size={18} />
              Approve
            </button>
            <button
              onClick={() => onReject(application)}
              disabled={processing}
              style={{
                padding: "12px",
                background: "#ef4444",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                !processing && (e.currentTarget.style.background = "#dc2626")
              }
              onMouseLeave={(e) =>
                !processing && (e.currentTarget.style.background = "#ef4444")
              }
            >
              <XCircle size={18} />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Reject Modal Component
function RejectModal({
  application,
  reason,
  setReason,
  onConfirm,
  onCancel,
  processing,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 50,
      }}
    >
      <div
        className="admin-card"
        style={{ maxWidth: "480px", width: "100%", margin: 0 }}
      >
        <div className="admin-card-header">
          <h3 className="admin-card-title">Reject Application</h3>
        </div>

        <div
          className="admin-card-body"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Rejecting application from{" "}
            <strong>{application.displayName}</strong>
          </p>

          <div>
            <label className="admin-label">Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide a reason for rejection..."
              className="admin-textarea"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <button
              onClick={onCancel}
              disabled={processing}
              className="admin-button-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={processing || !reason.trim()}
              style={{
                padding: "10px 16px",
                background: "#ef4444",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontWeight: "600",
                cursor:
                  processing || !reason.trim() ? "not-allowed" : "pointer",
                opacity: processing || !reason.trim() ? 0.5 : 1,
              }}
            >
              {processing ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
