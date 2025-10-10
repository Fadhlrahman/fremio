import { Link } from "react-router-dom";

export default function Register() {
  return (
    <section className="anchor auth-wrap">
      <div className="container">
        {/* Titlebar */}
        <div className="auth-titlebar">
          <h1>Register</h1>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <Link to="/login" className="auth-tab">
              🔓 Log in
            </Link>
            <Link to="/register" className="auth-tab active">
              👥 Register
            </Link>
          </div>

          {/* Body */}
          <div className="auth-body">
            <div className="auth-grid">
              <div>
                <label className="auth-label">First Name</label>
                <input className="auth-input" type="text" />
              </div>
              <div>
                <label className="auth-label">Last Name</label>
                <input className="auth-input" type="text" />
              </div>
            </div>

            <label className="auth-label">Email Address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
            />

            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
            />

            <label className="auth-label">Confirm Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
            />

            <label className="auth-check" style={{ marginTop: 12 }}>
              <input type="checkbox" /> I agree to the Terms of Service and
              Privacy Policy
            </label>

            <button className="auth-btn">Create Account</button>
          </div>
        </div>
      </div>
    </section>
  );
}
