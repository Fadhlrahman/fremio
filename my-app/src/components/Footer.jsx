import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="bg-[#f9ede7] py-8 border-t border-[#e0b7a9]">
      <div className="container mx-auto px-4 sm:px-6 grid gap-10 md:gap-8 min-h-[200px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand + contact */}
  <div>
          <div className="text-3xl font-bold mb-2">fremio</div>
          <p className="text-base text-gray-600 mb-4">Think Outside the box!</p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1">
                {/* location */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                </svg>
              </span>
              <span>
                Jalan Asep Berlian Gang Bunga 2 no.1,<br />
                Cicadas, kota Bandung
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span>
                {/* phone */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.6-.36c1.7.57 3.6.88 5 .26.33-.14.7-.02.94.22l1.9 1.9c.44.44.57 1.12.3 1.7-1.06 2.25-3.62 3.58-6.2 3.58C11.2 23.2.8 12.8.8 5.4c0-2.57 1.33-5.14 3.58-6.2.57-.27 1.25-.14 1.7.3l1.9 1.9c.24.24.36.61.22.94-.62 1.4-.31 3.3.26 5a1.5 1.5 0 0 1-.36 1.6L6.6 10.8z" />
                </svg>
              </span>
              <a href="tel:+6285387569977" className="hover:underline">+62 853 8756 9977</a>
            </li>
            <li className="flex items-center gap-2">
              <span>
                {/* mail */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" />
                </svg>
              </span>
              <a href="mailto:fremioid@gmail.com" className="hover:underline">fremioid@gmail.com</a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold mb-2 text-lg">Support</h4>
          <ul className="space-y-1 text-base">
            <li><a href="#" className="hover:underline">Help Center</a></li>
            <li><a href="#" className="hover:underline">Call Center</a></li>
            <li><a href="#" className="hover:underline">Order Status</a></li>
          </ul>
          
          {/* Tablet Printer Access */}
          <div className="mt-4 pt-4 border-t border-[#e0b7a9]">
            <h5 className="font-medium mb-2 text-sm text-gray-600">🖨️ Print Operator</h5>
            <button 
              onClick={() => {
                // Get current base path and construct proper URL
                const basePath = window.location.pathname.split('/')[1]; // 'fremio'
                const tabletPrinterUrl = `/${basePath}/tablet-printer`;
                window.open(tabletPrinterUrl, '_blank');
              }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 3h10v5H7V3zm0 7h10v8H7v-8zm-4-2h18v4H3V8zm3 2v8h12v-8H6z"/>
              </svg>
              Tablet Printer
            </button>
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold mb-2 text-lg">Company</h4>
          <ul className="space-y-1 text-base">
            <li><a href="#" className="hover:underline">About Us</a></li>
            <li><a href="#" className="hover:underline">Investor</a></li>
            <li><a href="#" className="hover:underline">Affiliates</a></li>
          </ul>
        </div>

        {/* Socials */}
        <div>
          <h4 className="font-semibold mb-2 text-lg">Follow Us</h4>
          <div className="flex flex-wrap gap-4">
            <a href="#" aria-label="YouTube" className="p-2 rounded-full border border-black hover:bg-[#e0b7a9] transition">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M10 15l5.2-3L10 9v6z" />
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className="p-2 rounded-full border border-black hover:bg-[#e0b7a9] transition">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.2" />
              </svg>
            </a>
            <a href="#" aria-label="TikTok" className="p-2 rounded-full border border-black hover:bg-[#e0b7a9] transition">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </a>
            <a href="#" aria-label="X" className="p-2 rounded-full border border-black hover:bg-[#e0b7a9] transition">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}