import { NavLink } from "react-router-dom";
import frame1 from "../assets/frame1.png"; // ganti sesuai asetmu
import frame2 from "../assets/frame2.png";
import frame3 from "../assets/frame3.png";

export default function Home() {
  return (
    <section className="hero-fremio">
      <div className="container hero-grid">
        {/* LEFT */}
        <div className="hero-left">
          <h1 className="hero-h1">
            Not a <span className="accent">photobooth</span>
            <br />
            Not a <span className="accent">photobox</span>
          </h1>

          <p className="hero-sub">
            fremio adalah cara baru merayakan momen.<br/> 

            Pilih frame, cetak instan, dan jadikan kenanganmu <br/>
            sesuatu yang hidup
          </p>

          <NavLink to="/frames" className="cta-pink">
            Get Started
          </NavLink>

          {/* dekorasi: kamera + roll film */}
          <CameraIcon className="deco cam-tl" />
          <FilmIcon className="deco film-tc" />
          <CameraIcon className="deco cam-bl" />
          <FilmIcon className="deco film-bc" />
        </div>

        {/* RIGHT – kanvas kolase fix agar rapi */}
        <div className="hero-right">
          <img src={frame1} alt="Contoh frame utama" className="shot main" />
          <img src={frame2} alt="Contoh frame kiri" className="shot left" />
          <img src={frame3} alt="Contoh frame kanan" className="shot right" />
        </div>
      </div>
    </section>
  );
}

/* ====== Ikon dekor ====== */
function CameraIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 6h3l1-2h2l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="4" fill="#fff" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
function FilmIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="14" width="36" height="36" rx="4" fill="currentColor" />
      <rect x="18" y="22" width="12" height="12" fill="#fff" />
      <rect x="34" y="22" width="4" height="12" fill="#fff" />
      <rect x="18" y="38" width="12" height="4" fill="#fff" />
      <rect x="48" y="20" width="6" height="24" rx="2" fill="currentColor" />
      <circle cx="51" cy="24" r="1.6" fill="#fff" />
      <circle cx="51" cy="40" r="1.6" fill="#fff" />
    </svg>
  );
}
