// src/components/Header.jsx
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import logoSalem from "../assets/logo-salem.png";
import burgerBarIcon from "../assets/burger-bar.png";
import homeIcon from "../assets/page-icon/page-home.png";
import aboutIcon from "../assets/page-icon/page-about.png";
import framesIcon from "../assets/page-icon/page-frames.png";
import createIcon from "../assets/page-icon/page-create.png";
import profileIcon from "../assets/page-icon/page-profile.png";
import settingsIcon from "../assets/page-icon/page-settings.png";
import logoutIcon from "../assets/page-icon/logout.png";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const headerRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Active state untuk section di homepage
  const isHomeActive = pathname === "/" && (hash === "" || hash === "#home");
  const isAboutActive = pathname === "/" && hash === "#about";

  // Tutup panel saat route berubah / klik di luar
  useEffect(() => {
    setOpen(false);
    setProfileDropdownOpen(false);
    setMenuOpen(false);
  }, [pathname, hash]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target)) {
        setOpen(false);
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Elevation on scroll (pertahankan dari kode lama)
  useEffect(() => {
    const el = headerRef.current;
    const onScroll = () => {
      if (!el) return;
      el.classList.toggle("elev", window.scrollY > 6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: false });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate("/");
  };

  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setProfileDropdownOpen((prev) => !prev);
  };

  return (
    <>
      <header ref={headerRef} className={`site-header ${open ? "open" : ""}`}>
        <div className="container header-bar">
        {/* Left: Logo */}
        <div className="logo">
          <img src={logoSalem} alt="Fremio Logo" className="logo-image" />
        </div>

        {/* Center: Nav */}
        <nav className="main-nav">
          {/* Home & About: tetap hash-section */}
          <Link
            to="/#home"
            className={"nav-link" + (isHomeActive ? " active" : "")}
          >
            <img src={homeIcon} alt="" className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link
            to="/#about"
            className={"nav-link" + (isAboutActive ? " active" : "")}
          >
            <img src={aboutIcon} alt="" className="nav-icon" />
            <span>About</span>
          </Link>

          {/* Route pages */}
          <NavLink
            to="/frames"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            <img src={framesIcon} alt="" className="nav-icon" />
            <span>Frames</span>
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            <img src={createIcon} alt="" className="nav-icon" />
            <span>Create</span>
          </NavLink>
        </nav>

        {/* Right: Action */}
        <div className="header-actions">
          {isAuthenticated ? (
            <div style={{ position: "relative" }} ref={profileDropdownRef}>
              <button
                onClick={toggleProfileDropdown}
                className="btn-login"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(224, 183, 169, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "20px" }}>👤</span>
                <span style={{ fontWeight: 600 }}>
                  {user?.firstName || user?.name || "Profile"}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    transition: "transform 0.2s",
                    transform: profileDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "white",
                    borderRadius: "12px",
                    boxShadow:
                      "0 10px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
                    minWidth: "200px",
                    padding: "8px",
                    zIndex: 1000,
                    border: "1px solid rgba(224, 183, 169, 0.2)",
                  }}
                >
                  {/* Profile Option */}
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333",
                      transition: "all 0.2s",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(224, 183, 169, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <img src={profileIcon} alt="" style={{ width: "18px", height: "18px" }} />
                    <span>Profile</span>
                  </Link>

                  {/* Settings Option */}
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#333",
                      transition: "all 0.2s",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(224, 183, 169, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <img src={settingsIcon} alt="" style={{ width: "18px", height: "18px" }} />
                    <span>Settings</span>
                  </Link>

                  {/* Divider */}
                  <div
                    style={{
                      height: "1px",
                      background: "rgba(224, 183, 169, 0.2)",
                      margin: "8px 0",
                    }}
                  />

                  {/* Logout Option */}
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      color: "#dc2626",
                      transition: "all 0.2s",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(220, 38, 38, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <img src={logoutIcon} alt="" style={{ width: "18px", height: "18px" }} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/login" className="btn-login">
              Login/Register
            </NavLink>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <img
            src={burgerBarIcon}
            alt="Menu"
            className="menu-toggle-icon"
            draggable={false}
          />
        </button>
      </div>
      </header>

      {/* Overlay untuk menggelapkan background saat menu mobile terbuka */}
      <div
        className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile menu */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {/* Logo di dalam menu */}
        <div style={{ padding: "24px", borderBottom: "1px solid rgba(224, 183, 169, 0.2)" }}>
          <img src={logoSalem} alt="Fremio Logo" style={{ height: "32px" }} />
        </div>

        <nav className="mobile-nav">
          <Link
            to="/#home"
            className={"nav-link" + (isHomeActive ? " active" : "")}
          >
            <img src={homeIcon} alt="" className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link
            to="/#about"
            className={"nav-link" + (isAboutActive ? " active" : "")}
          >
            <img src={aboutIcon} alt="" className="nav-icon" />
            <span>About</span>
          </Link>
          <NavLink
            to="/frames"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            <img src={framesIcon} alt="" className="nav-icon" />
            <span>Frames</span>
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) =>
              "nav-link" + (isActive ? " active" : "")
            }
          >
            <img src={createIcon} alt="" className="nav-icon" />
            <span>Create</span>
          </NavLink>
        </nav>

        {isAuthenticated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "0 24px", width: "100%" }}>
            <NavLink
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
              style={{ width: "100%" }}
            >
              <img src={profileIcon} alt="" style={{ width: "22px", height: "22px" }} />
              <span>Profile</span>
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
              style={{ width: "100%" }}
            >
              <img src={settingsIcon} alt="" style={{ width: "22px", height: "22px" }} />
              <span>Settings</span>
            </NavLink>

            <div
              style={{
                height: "1px",
                background: "rgba(224, 183, 169, 0.2)",
                margin: "8px 0",
              }}
            />

            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#dc2626",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <img src={logoutIcon} alt="" style={{ width: "22px", height: "22px" }} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn-login mobile">
            Login/Register
          </NavLink>
        )}
      </div>
    </>
  );
}
