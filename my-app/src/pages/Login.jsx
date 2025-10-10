import { Link } from "react-router-dom";

export default function Login() {
  return (
    <section className="anchor auth-wrap">
      <div className="container">
        {/* Titlebar */}
        <div className="auth-titlebar">
          <h1>Log In</h1>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <Link to="/login" className="auth-tab active">
              🔓 Log in
            </Link>
            <Link to="/register" className="auth-tab">
              👥 Register
            </Link>
          </div>

          {/* Body */}
          <div className="auth-body">
            <label className="auth-label">Email address</label>
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

            <label className="auth-check">
              <input type="checkbox" /> remember me
            </label>

            <button className="auth-btn">Login</button>

            <p className="auth-help">
              don’t have account? <Link to="/register">register</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
