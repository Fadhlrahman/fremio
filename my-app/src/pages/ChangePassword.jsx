import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        setSuccess("Password changed successfully! Redirecting...");
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          navigate("/settings#security");
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error("Password change error:", error);
      setError("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="anchor auth-wrap">
      <div className="container">
        <div className="auth-titlebar">
          <h1>Change Password</h1>
          <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "8px" }}>
            Update your password to keep your account secure
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <div className="auth-tab active">🔐 Change Password</div>
          </div>

          <form className="auth-body" onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "8px",
                  color: "#c33",
                  fontSize: "0.9rem",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#efe",
                  border: "1px solid #cfc",
                  borderRadius: "8px",
                  color: "#3c3",
                  fontSize: "0.9rem",
                  marginBottom: "16px",
                }}
              >
                {success}
              </div>
            )}

            <div
              style={{
                marginBottom: "12px",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Logged in as:
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                {user?.email || user?.displayName}
              </div>
            </div>

            <label className="auth-label">Current Password</label>
            <input
              className="auth-input"
              type="password"
              name="currentPassword"
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <label className="auth-label">New Password</label>
            <input
              className="auth-input"
              type="password"
              name="newPassword"
              placeholder="Enter new password (min. 6 characters)"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <label className="auth-label">Confirm New Password</label>
            <input
              className="auth-input"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Changing Password..." : "Change Password"}
            </button>

            <p className="auth-help">
              <Link to="/settings#security">← Back to Settings</Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
