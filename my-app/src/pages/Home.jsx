import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { trackUserSession, trackFunnelEvent } from "../services/analyticsService";
import frame1 from "../assets/frame1.png";
import frame2 from "../assets/frame2.png";
import frame3 from "../assets/frame3.png";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [heroVariant, setHeroVariant] = useState('A');

  // A/B Test: Determine variant on first load
  useEffect(() => {
    const storedVariant = localStorage.getItem('heroVariant');
    if (storedVariant) {
      setHeroVariant(storedVariant);
    } else {
      // Random 50/50 split
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      setHeroVariant(variant);
      localStorage.setItem('heroVariant', variant);
    }
  }, []);

  // Track user visit on Home page
  useEffect(() => {
    const trackVisit = async () => {
      try {
        console.log("🏠 Home: Tracking visit...");
        await trackUserSession();
        console.log("✅ Home: Session tracked");
        await trackFunnelEvent("visit");
        console.log("✅ Home: Visit event tracked");
      } catch (error) {
        console.error("❌ Home: Tracking error:", error);
      }
    };
    trackVisit();
  }, []);

  const heroContent = {
    A: {
      headline: (
        <>
          <span className="accent">Momen</span> tidak perlu dijelaskan.
          <br />
          Cukup <span className="accent">dirasakan</span>.
        </>
      ),
      subCopy: "Fremio membantu kamu mengemas momen menjadi sesuatu yang layak diingat. Dengan cara yang sederhana, indah, dan terasa milikmu.",
      cta: "Ciptakan Momen"
    },
    B: {
      headline: (
        <>
          Setiap orang punya <span className="accent">cara sendiri</span> merayakan <span className="accent">momen</span>
        </>
      ),
      subCopy: "Fremio bukan tentang bagaimana seharusnya momen terlihat. Ini tentang bagaimana momen itu terasa — bagi kamu.",
      cta: "Rayakan Momenmu"
    }
  };

  const currentHero = heroContent[heroVariant];

  return (
    <>
      {/* ======= HERO (/#home) ======= */}
      <section
        id="home"
        className="hero-fremio"
        style={{ scrollMarginTop: "64px" }}
      >
        <div className="container">
          <div className="hero-grid">
            {/* LEFT */}
            <div className="hero-left">
              <h1 className="hero-h1">
                {currentHero.headline}
              </h1>

              <p className="hero-sub">
                {currentHero.subCopy}
              </p>

              <NavLink
                to="/frames"
                className="cta-pink"
              >
                {currentHero.cta}
              </NavLink>

              {/* dekorasi: kamera + roll film */}
              <CameraIcon className="deco cam-tl" />
              <FilmIcon className="deco film-tc" />
              <CameraIcon className="deco cam-bl" />
              <FilmIcon className="deco film-bc" />
            </div>

            {/* RIGHT – kolase */}
            <div className="hero-right">
              <img
                src={frame1}
                alt="Contoh frame utama"
                className="shot main"
              />
              <img src={frame2} alt="Contoh frame kiri" className="shot left" />
              <img
                src={frame3}
                alt="Contoh frame kanan"
                className="shot right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======= ABOUT (/#about) ======= */}
      <section
        id="about"
        className="about-section"
        style={{ scrollMarginTop: "64px" }}
      >
        <div className="container">
          <div className="about-content">
            {/* Cinematic Title */}
            <div className="about-header fade-in-up">
              <span className="about-overline">— fremio journey —</span>
              <h2 className="about-title">
                <span className="about-title-main">Momen yang Kita Lewatkan</span>
              </h2>
            </div>

            {/* Story Block */}
            <div className="about-story">
              <div className="story-quote fade-in-up delay-1">"</div>
              <p className="about-text fade-in-up delay-2">
                Suatu hari kamu akan melihat ke belakang dan menyadari bahwa bukan <em>momen besar</em> yang paling penting, tapi <em>momen sehari-hari</em> yang mungkin biasa saja—tawa keluarga, candaan teman, tatapan lembut pasangan.
              </p>
              <p className="about-text about-text-fade fade-in-up delay-3">
                Suatu hari rumah akan terasa sepi. Tempat favoritmu terasa hambar. Yang paling penting adalah: <strong>apakah kamu benar-benar ada di sana</strong> saat itu semua terjadi?
              </p>
              <p className="about-closing fade-in-up delay-4">
                — Mari berada di sana, bersama —
              </p>
            </div>

            {/* Minimal Divider */}
            <div className="about-divider fade-in-up delay-5">
              <span></span>
              <span className="divider-dot">◆</span>
              <span></span>
            </div>

            {/* Vision & Mission - Refined */}
            <div className="mv-grid">
              <div className="mv-card fade-in-up delay-5">
                <span className="mv-label">Vision</span>
                <p>
                  Setiap orang punya cerita yang layak dirayakan. Fremio hadir sebagai teman dalam setiap cerita unik yang terjadi sehari-hari.
                </p>
              </div>

              <div className="mv-card fade-in-up delay-6">
                <span className="mv-label">Mission</span>
                <p>
                  Menyediakan frame yang pas untuk ceritamu setiap bulannya—agar momen kecil terasa istimewa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ====== Ikon dekor (asli kamu, tidak diubah) ====== */
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
