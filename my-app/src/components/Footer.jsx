export default function Footer() {
  return (
    <footer className="app-footer footer-light">
      <div className="container footer-grid">
        {/* Brand + contact */}
        <div className="footer-brand">
          <div className="footer-logo">fremio</div>
          <p className="footer-tagline">Cherris what matters!</p>

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
              <a href="#">Help Center</a>
            </li>
            <li>
              <a href="#">Call Center</a>
            </li>
            <li>
              <a href="#">Order Status</a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div className="footer-col">
          <h4>Company</h4>
          <ul className="links">
            <li>
              <a href="#">About Us</a>
            </li>
            <li>
              <a href="#">Investor</a>
            </li>
            <li>
              <a href="#">Affiliates</a>
            </li>
          </ul>
        </div>

        {/* Socials */}
        <div className="footer-col">
          <h4>Follow Us</h4>
          <div className="socials">
            <a
              className="social-btn"
              href="#"
              aria-label="YouTube"
              rel="noopener"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 15l5.2-3L10 9v6z" />
                <path
                  d="M23 7s-.2-1.6-.8-2.3c-.8-.8-1.6-.8-2-1C17.6 3 12 3 12 3s-5.6 0-8.2.7c-.4.2-1.2.2-2 1C1.2 5.4 1 7 1 7s0 1.7 0 3.3v1.5C1 13.3 1 15 1 15s.2 1.6.8 2.3c.8.8 1.8.8 2.2.9C6.6 18.9 12 19 12 19s5.6 0 8.2-.7c.4-.1 1.2-.1 2-.9.6-.7.8-2.3.8-2.3s0-1.7 0-3.2V10.3C23 8.7 23 7 23 7z"
                  fill="none"
                  stroke="currentColor"
                />
              </svg>
            </a>
            <a
              className="social-btn"
              href="#"
              aria-label="Instagram"
              rel="noopener"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  ry="5"
                  fill="none"
                  stroke="currentColor"
                />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.2" />
              </svg>
            </a>
            <a
              className="social-btn"
              href="#"
              aria-label="TikTok"
              rel="noopener"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 3v4a5 5 0 0 0 5 5h1v3a9 9 0 1 1-9-9h3z" />
              </svg>
            </a>
            <a className="social-btn" href="#" aria-label="X" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 4l16 16M20 4L4 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
