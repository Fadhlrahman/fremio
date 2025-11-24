import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAllAffiliateApplications,
  updateApplicationStatus,
  deleteAffiliateApplication,
  getAffiliateStats,
} from "../../services/affiliateService";

export default function AdminAffiliates() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, statistics] = await Promise.all([
        getAllAffiliateApplications(),
        getAffiliateStats(),
      ]);
      setApplications(apps);
      setStats(statistics);
    } catch (error) {
      console.error("Error loading affiliate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin ${
        newStatus === "approved" ? "menyetujui" : "menolak"
      } aplikasi ini?`
    );

    if (!confirmed) return;

    const result = await updateApplicationStatus(
      applicationId,
      newStatus,
      user.email
    );

    if (result.success) {
      alert(
        `Aplikasi berhasil ${
          newStatus === "approved" ? "disetujui" : "ditolak"
        }!`
      );
      loadData();
      setSelectedApp(null);
    } else {
      alert("Gagal mengupdate status aplikasi");
    }
  };

  const handleDelete = async (applicationId) => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus aplikasi ini?"
    );

    if (!confirmed) return;

    const result = await deleteAffiliateApplication(applicationId);

    if (result.success) {
      alert("Aplikasi berhasil dihapus!");
      loadData();
      setSelectedApp(null);
    } else {
      alert("Gagal menghapus aplikasi");
    }
  };

  const filteredApplications =
    filter === "all"
      ? applications
      : applications.filter((app) => app.status === filter);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: "Pending", color: "#f59e0b" },
      approved: { label: "Approved", color: "#10b981" },
      rejected: { label: "Rejected", color: "#ef4444" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "0.85rem",
          fontWeight: "600",
          backgroundColor: `${badge.color}20`,
          color: badge.color,
        }}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="admin-affiliates">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-affiliates">
      {/* Header & Stats */}
      <div className="page-header">
        <h1>🤝 Affiliate Applications</h1>
        <p>Kelola aplikasi affiliate partner</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({stats.total})
        </button>
        <button
          className={filter === "pending" ? "active" : ""}
          onClick={() => setFilter("pending")}
        >
          Pending ({stats.pending})
        </button>
        <button
          className={filter === "approved" ? "active" : ""}
          onClick={() => setFilter("approved")}
        >
          Approved ({stats.approved})
        </button>
        <button
          className={filter === "rejected" ? "active" : ""}
          onClick={() => setFilter("rejected")}
        >
          Rejected ({stats.rejected})
        </button>
      </div>

      {/* Applications Table */}
      <div className="applications-section">
        {filteredApplications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Tidak ada aplikasi {filter !== "all" ? filter : ""}</h3>
            <p>Belum ada aplikasi affiliate yang masuk</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Platform</th>
                  <th>Followers</th>
                  <th>Niche</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.name}</strong>
                    </td>
                    <td>{app.email}</td>
                    <td>
                      <span className="platform-badge">{app.platform}</span>
                    </td>
                    <td>{app.followers}</td>
                    <td>{app.niche}</td>
                    <td>{formatDate(app.submittedAt)}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => setSelectedApp(app)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        {app.status === "pending" && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() =>
                                handleStatusUpdate(app.id, "approved")
                              }
                              title="Approve"
                            >
                              ✅
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() =>
                                handleStatusUpdate(app.id, "rejected")
                              }
                              title="Reject"
                            >
                              ❌
                            </button>
                          </>
                        )}
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(app.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedApp(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <label>Name:</label>
                <p>{selectedApp.name}</p>
              </div>

              <div className="detail-group">
                <label>Email:</label>
                <p>{selectedApp.email}</p>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label>Platform:</label>
                  <p>{selectedApp.platform}</p>
                </div>

                <div className="detail-group">
                  <label>Followers:</label>
                  <p>{selectedApp.followers}</p>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label>Niche:</label>
                  <p>{selectedApp.niche}</p>
                </div>

                <div className="detail-group">
                  <label>Website:</label>
                  <p>
                    {selectedApp.website ? (
                      <a
                        href={selectedApp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedApp.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
              </div>

              <div className="detail-group">
                <label>Message:</label>
                <p className="message-text">{selectedApp.message}</p>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label>Submitted:</label>
                  <p>{formatDate(selectedApp.submittedAt)}</p>
                </div>

                <div className="detail-group">
                  <label>Status:</label>
                  <p>{getStatusBadge(selectedApp.status)}</p>
                </div>
              </div>

              {selectedApp.reviewedAt && (
                <div className="detail-row">
                  <div className="detail-group">
                    <label>Reviewed At:</label>
                    <p>{formatDate(selectedApp.reviewedAt)}</p>
                  </div>

                  <div className="detail-group">
                    <label>Reviewed By:</label>
                    <p>{selectedApp.reviewedBy || "-"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedApp.status === "pending" && (
                <>
                  <button
                    className="btn btn-approve-large"
                    onClick={() =>
                      handleStatusUpdate(selectedApp.id, "approved")
                    }
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="btn btn-reject-large"
                    onClick={() =>
                      handleStatusUpdate(selectedApp.id, "rejected")
                    }
                  >
                    ❌ Reject
                  </button>
                </>
              )}
              <button
                className="btn btn-delete-large"
                onClick={() => handleDelete(selectedApp.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-affiliates {
          padding: 20px;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 8px;
          color: #111;
        }

        .page-header p {
          color: #64748b;
          font-size: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .stat-icon {
          font-size: 2.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #111;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 4px;
        }

        .filter-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0;
        }

        .filter-tabs button {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: 600;
          color: #64748b;
          transition: all 0.3s;
          margin-bottom: -2px;
        }

        .filter-tabs button:hover {
          color: #e0b7a9;
        }

        .filter-tabs button.active {
          color: #e0b7a9;
          border-bottom-color: #e0b7a9;
        }

        .applications-section {
          background: white;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        .applications-table {
          width: 100%;
          border-collapse: collapse;
        }

        .applications-table th {
          background: #f8f9fa;
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #334155;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .applications-table td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
        }

        .applications-table tbody tr:hover {
          background: #f8f9fa;
        }

        .platform-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #e0b7a9;
          color: white;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
        }

        .action-buttons button {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          background: #f1f5f9;
        }

        .action-buttons button:hover {
          transform: scale(1.1);
        }

        .btn-view:hover {
          background: #dbeafe;
        }

        .btn-approve:hover {
          background: #dcfce7;
        }

        .btn-reject:hover {
          background: #fee2e2;
        }

        .btn-delete:hover {
          background: #fee2e2;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          color: #111;
        }

        .empty-state p {
          color: #64748b;
        }

        .loading-state {
          text-align: center;
          padding: 60px;
          font-size: 1.2rem;
          color: #64748b;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          margin: 0;
          color: #111;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: #f1f5f9;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
          color: #64748b;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #111;
        }

        .modal-body {
          padding: 24px;
        }

        .detail-group {
          margin-bottom: 20px;
        }

        .detail-group label {
          display: block;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
          font-size: 0.9rem;
        }

        .detail-group p {
          margin: 0;
          color: #475569;
          font-size: 1rem;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .message-text {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .detail-group a {
          color: #e0b7a9;
          text-decoration: none;
        }

        .detail-group a:hover {
          text-decoration: underline;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 2px solid #e2e8f0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-footer .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-approve-large {
          background: #dcfce7;
          color: #10b981;
        }

        .btn-approve-large:hover {
          background: #bbf7d0;
        }

        .btn-reject-large {
          background: #fee2e2;
          color: #ef4444;
        }

        .btn-reject-large:hover {
          background: #fecaca;
        }

        .btn-delete-large {
          background: #fee2e2;
          color: #ef4444;
        }

        .btn-delete-large:hover {
          background: #fecaca;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filter-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
          }

          .detail-row {
            grid-template-columns: 1fr;
          }

          .modal-footer {
            flex-direction: column;
          }

          .modal-footer .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
