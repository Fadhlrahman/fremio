import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-bar">
        {/* Left: Logo */}
        <div className="logo">fremio</div>

        {/* Center: Nav */}
        <nav className="main-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            About
          </NavLink>
          <NavLink
            to="/frames"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            Frames
          </NavLink>
        </nav>

        {/* Right: Action */}
        <div className="header-actions">
          <NavLink to="/login" className="btn-login">
            Login/Register
          </NavLink>
        </div>
      </div>
    </header>
  );
}
