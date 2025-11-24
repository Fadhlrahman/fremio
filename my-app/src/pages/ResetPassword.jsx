import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../config/firebase.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState("");
  const [invalidLink, setInvalidLink] = useState(false);

  // Verify the reset code when component mounts
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setInvalidLink(true);
        setVerifying(false);
        setError("Invalid or missing reset code");
        return;
      }

      try {
        // Verify the password reset code is valid
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setVerifying(false);
      } catch (error) {
        console.error("Code verification error:", error);
        setInvalidLink(true);
        setVerifying(false);

        if (error.code === "auth/expired-action-code") {
          setError(
            "This password reset link has expired. Please request a new one."
          );
        } else if (error.code === "auth/invalid-action-code") {
          setError(
            "This password reset link is invalid or has already been used."
          );
        } else {
          setError("Unable to verify reset link. Please request a new one.");
        }
      }
    };

    verifyCode();
  }, [oobCode]);

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
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Confirm the password reset
      await confirmPasswordReset(auth, oobCode, formData.newPassword);

      setSuccess("✅ Password has been reset successfully!");
      setFormData({
        newPassword: "",
        confirmPassword: "",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Password reset successful! You can now log in with your new password.",
          },
        });
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);

      if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else if (error.code === "auth/expired-action-code") {
        setError("This reset link has expired. Please request a new one.");
      } else if (error.code === "auth/invalid-action-code") {
        setError("This reset link is invalid or has already been used.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while verifying the code
  if (verifying) {
    return (
      <section className="anchor auth-wrap">
        <div className="container">
          <div className="auth-titlebar">
            <h1>Reset Password</h1>
          </div>
          <div className="auth-card">
            <div
              className="auth-body"
              style={{ textAlign: "center", padding: "40px 20px" }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "16px",
                  animation: "spin 1s linear infinite",
                }}
              >
                ⏳
              </div>
              <p style={{ color: "#64748b" }}>Verifying reset link...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show error if link is invalid
  if (invalidLink) {
    return (
      <section className="anchor auth-wrap">
        <div className="container">
          <div className="auth-titlebar">
            <h1>Reset Password</h1>
          </div>
          <div className="auth-card">
            <div className="auth-body">
              <div
                style={{
                  padding: "16px",
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "8px",
                  color: "#c33",
                  fontSize: "0.9rem",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                  Invalid Reset Link
                </div>
                <div>{error}</div>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#0369a1",
                  marginBottom: "20px",
                }}
              >
                <strong>What to do:</strong>
                <ul style={{ marginTop: "8px", marginLeft: "20px" }}>
                  <li>Go back to login page</li>
                  <li>Click "Forgot password?"</li>
                  <li>Request a new reset link</li>
                  <li>Check your email (including spam folder)</li>
                </ul>
              </div>

              <Link to="/login">
                <button
                  className="auth-btn"
                  style={{ width: "100%", marginBottom: "12px" }}
                >
                  Go to Login
                </button>
              </Link>

              <p className="auth-help" style={{ textAlign: "center" }}>
                Need help?{" "}
                <a href="mailto:support@fremio.com">Contact Support</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show reset password form
  return (
    <section className="anchor auth-wrap">
      <div className="container">
        <div className="auth-titlebar">
          <h1>Reset Password</h1>
          <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "8px" }}>
            Enter your new password below
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <div className="auth-tab active">🔐 Reset Password</div>
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
                  padding: "16px",
                  background: "#d1fae5",
                  border: "1px solid #6ee7b7",
                  borderRadius: "8px",
                  color: "#065f46",
                  fontSize: "0.9rem",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                {success}
                <div
                  style={{
                    fontSize: "0.85rem",
                    marginTop: "8px",
                    opacity: 0.8,
                  }}
                >
                  Redirecting to login page...
                </div>
              </div>
            )}

            <div
              style={{
                marginBottom: "20px",
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
                Reset password for:
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                {email}
              </div>
            </div>

            <label className="auth-label">New Password</label>
            <input
              className="auth-input"
              type="password"
              name="newPassword"
              placeholder="Enter new password (min. 6 characters)"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading || success}
              autoFocus
            />

            <label className="auth-label">Confirm New Password</label>
            <input
              className="auth-input"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading || success}
            />

            <div
              style={{
                padding: "12px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "#0369a1",
                marginBottom: "20px",
              }}
            >
              <strong>💡 Password Requirements:</strong>
              <ul
                style={{
                  marginTop: "8px",
                  marginLeft: "20px",
                  marginBottom: 0,
                }}
              >
                <li>Minimum 6 characters</li>
                <li>Should be unique and secure</li>
                <li>Not easily guessable</li>
              </ul>
            </div>

            <button
              className="auth-btn"
              type="submit"
              disabled={loading || success}
              style={{ marginBottom: "12px" }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>

            <p className="auth-help" style={{ textAlign: "center" }}>
              Remember your password? <Link to="/login">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
