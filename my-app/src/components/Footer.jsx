// src/components/Footer.jsx
import { FaInstagram, FaTiktok } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="app-footer footer-light">
      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {/* Brand + contact */}
        <div className="footer-brand" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="footer-logo">fremio</div>
          <p className="footer-tagline" style={{ marginBottom: "0.5rem" }}>Save your moments!</p>

          <ul className="contact" style={{ display: "flex", justifyContent: "center", padding: 0, margin: 0 }}>
            <li style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="ico">
                {/* mail */}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" />
                </svg>
              </span>
              <a href="mailto:fremioid@gmail.com">fremioid@gmail.com</a>
            </li>
          </ul>
        </div>

        <div className="footer-col" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h4>Follow Us</h4>
          <div className="socials" style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <a
              className="social-btn ig"
              href="https://instagram.com/fremio.id"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram size={20} />
            </a>
            <a
              className="social-btn tt"
              href="https://www.tiktok.com/@fremio.id"
              aria-label="TikTok"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTiktok size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
