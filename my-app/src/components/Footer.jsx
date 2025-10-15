export default function Footer() {
  return (
    <footer className="border-t border-[#e6d5ca] bg-[#fbf6f3]">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-12">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:items-start xl:grid-cols-[1.75fr_1fr_1fr_1fr] xl:gap-16">
          {/* Brand + contact */}
          <div className="space-y-7 lg:col-span-2 xl:col-span-1 xl:max-w-sm">
            <div className="space-y-2">
              <span className="text-4xl font-semibold tracking-[0.12em] text-[#1c1b1b]">fremio</span>
              <p className="text-sm font-medium uppercase tracking-[0.32em] text-[#1c1b1b]">Cherris what matters!</p>
            </div>

            <ul className="space-y-3 text-sm text-[#1c1b1b]">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-[#1c1b1b]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                  </svg>
                </span>
                <span className="leading-relaxed">
                  Jalan Asep Berlian Gang Bunga 2 no.1,<br />
                  Cicadas, kota Bandung
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#1c1b1b]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.6-.36c1.7.57 3.6.88 5 .26.33-.14.7-.02.94.22l1.9 1.9c.44.44.57 1.12.3 1.7-1.06 2.25-3.62 3.58-6.2 3.58C11.2 23.2.8 12.8.8 5.4c0-2.57 1.33-5.14 3.58-6.2.57-.27 1.25-.14 1.7.3l1.9 1.9c.24.24.36.61.22.94-.62 1.4-.31 3.3.26 5a1.5 1.5 0 0 1-.36 1.6L6.6 10.8z" />
                  </svg>
                </span>
                <a href="tel:+6285387569977" className="font-medium text-[#1c1b1b] transition hover:opacity-80">+62 853 8756 9977</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#1c1b1b]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" />
                  </svg>
                </span>
                <a href="mailto:fremioid@gmail.com" className="font-medium text-[#1c1b1b] transition hover:opacity-80">fremioid@gmail.com</a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3 text-[#1c1b1b]">
            <h4 className="text-base font-semibold tracking-wide">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="transition hover:opacity-80">Help Center</a></li>
              <li><a href="#" className="transition hover:opacity-80">Call Center</a></li>
              <li><a href="#" className="transition hover:opacity-80">Order Status</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3 text-[#1c1b1b]">
            <h4 className="text-base font-semibold tracking-wide">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="transition hover:opacity-80">About Us</a></li>
              <li><a href="#" className="transition hover:opacity-80">Investor</a></li>
              <li><a href="#" className="transition hover:opacity-80">Affiliates</a></li>
            </ul>
          </div>

          {/* Socials */}
          <div className="space-y-3 text-[#1c1b1b]">
            <h4 className="text-base font-semibold tracking-wide">Follow Us</h4>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: 'YouTube', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 15l5.2-3L10 9v6z" />
                  </svg>
                ) },
                { label: 'Instagram', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.2" />
                  </svg>
                ) },
                { label: 'TikTok', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                ) },
                { label: 'X', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) }
              ].map((item) => (
                <a
                  key={item.label}
                  href="#"
                  aria-label={item.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1c1b1b] text-[#1c1b1b] transition hover:bg-[#1c1b1b] hover:text-white"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}