// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { FaYoutube, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="app-footer footer-light">
      <div className="container footer-grid">
        {/* Brand + contact */}
        <div className="footer-brand">
          <div className="footer-logo">fremio</div>
          <p className="footer-tagline">Think Outside The Box!</p>

          <ul className="contact">
            <li>
              <span className="ico">
                {/* location */}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                </svg>
              </span>
              <span>
                Jalan Asep Berlian Gang Bunga 2 no.1,
                <br />
                Cicadas, kota Bandung
              </span>
            </li>
            <li>
              <span className="ico">
                {/* phone */}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.6-.36c1.7.57 3.6.88 5 .26.33-.14.7-.02.94.22l1.9 1.9c.44.44.57 1.12.3 1.7-1.06 2.25-3.62 3.58-6.2 3.58C11.2 23.2.8 12.8.8 5.4c0-2.57 1.33-5.14 3.58-6.2.57-.27 1.25-.14 1.7.3l1.9 1.9c.24.24.36.61.22.94-.62 1.4-.31 3.3.26 5a1.5 1.5 0 0 1-.36 1.6L6.6 10.8z" />
                </svg>
              </span>
              <a href="tel:+6285387569977">+62 853 8756 9977</a>
            </li>
            <li>
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

        {/* Support */}
        <div className="footer-col">
          <h4>Support</h4>
          <ul className="links">
            <li>
              <Link to="/help-center">Help Center</Link>
            </li>
            <li>
              <Link to="/call-center">Call Center</Link>
            </li>
            <li>
              <Link to="/order-status">Order Status</Link>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div className="footer-col">
          <h4>Company</h4>
          <ul className="links">
            <li>
              <Link to="/about-us">About Us</Link>
            </li>
            <li>
              <Link to="/investor">Investor</Link>
            </li>
            <li>
              <Link to="/affiliates">Affiliates</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Follow Us</h4>
          <div className="socials">
            <a
              className="social-btn yt"
              href="https://youtube.com/@fremio"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube size={20} />
            </a>
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
              href="https://www.tiktok.com/@fremio"
              aria-label="TikTok"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTiktok size={20} />
            </a>
            <a
              className="social-btn x"
              href="https://x.com/fremio"
              aria-label="X (Twitter)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaXTwitter size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
