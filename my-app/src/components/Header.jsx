// src/components/Header.jsx
import { NavLink, Link, useLocation } from "react-router-dom";

export default function Header() {
  const { pathname, hash } = useLocation();

  // active state manual untuk hash links di homepage
  const isHomeActive = pathname === "/" && (hash === "" || hash === "#home");
  const isAboutActive = pathname === "/" && hash === "#about";

  return (
    <header className="site-header">
      <div className="container header-bar">
        {/* Left: Logo */}
        <div className="logo">fremio</div>

        {/* Center: Nav */}
        <nav className="main-nav">
          {/* Home & About: scroll ke section di halaman root */}
          <Link
            to={{ pathname: "/", hash: "#home" }}
            className={"nav-link" + (isHomeActive ? " active" : "")}
          >
            Home
          </Link>
          <Link
            to={{ pathname: "/", hash: "#about" }}
            className={"nav-link" + (isAboutActive ? " active" : "")}
          >
            About
          </Link>

          {/* Frames tetap route terpisah */}
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
