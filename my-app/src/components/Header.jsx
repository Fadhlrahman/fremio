// src/components/Header.jsx
import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);
  const { pathname, hash } = useLocation();

  // Active state manual untuk link hash (#home/#about)
  const isHomeActive = pathname === "/" && (hash === "" || hash === "#home");
  const isAboutActive = pathname === "/" && hash === "#about";

  // Tutup panel saat route berubah / klik di luar
  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    function onDoc(e) {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Elevation on scroll
  useEffect(() => {
    const el = headerRef.current;
    const onScroll = () => {
      if (!el) return;
      el.classList.toggle("elev", window.scrollY > 6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={headerRef} className={`site-header ${open ? "open" : ""}`}>
      <div className="container header-bar">
        {/* Left: Logo */}
        <div className="logo">fremio</div>

        {/* Center: Nav */}
        <nav className="main-nav">
          {/* Home & About: scroll section di homepage */}
          <Link
            to="/#home"
            className={"nav-link" + (isHomeActive ? " active" : "")}
          >
            Home
          </Link>
          <Link
            to="/#about"
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
        <div className="header-actions" style={{ display: "flex", gap: 8 }}>
          {/* Toggle (muncul saat mobile via CSS) */}
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {/* ikon burger sederhana */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <NavLink to="/login" className="btn-login">
            Login/Register
          </NavLink>
        </div>
      </div>
    </header>
  );
}
