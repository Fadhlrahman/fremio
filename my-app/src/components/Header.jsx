import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import logoSalem from "../assets/logo-salem.png";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = (
    <>
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
      <NavLink
        to="/create"
        className={({ isActive }) =>
          "nav-link" + (isActive ? " active" : "")
        }
      >
        Create
      </NavLink>
    </>
  );

  return (
    <header className="site-header">
      <div className="container header-bar">
        {/* Left: Logo */}
        <div className="logo">
          <img src={logoSalem} alt="Fremio" style={{ height: "40px" }} />
        </div>

        {/* Center: Nav */}
        <nav className="main-nav">{navLinks}</nav>

        {/* Right: Action */}
        <div className="header-actions">
          <NavLink to="/login" className="btn-login">
            Login/Register
          </NavLink>
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <nav className="mobile-nav">{navLinks}</nav>
        <NavLink to="/login" className="btn-login mobile">
          Login/Register
        </NavLink>
      </div>
    </header>
  );
}
