import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { trackUserSession, trackFunnelEvent } from "../services/analyticsService";
import frame1 from "../assets/frame1.png";
import frame2 from "../assets/frame2.png";
import frame3 from "../assets/frame3.png";

export default function Home() {
  const { isAuthenticated } = useAuth();

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
                Not a <span className="accent">photobooth</span>
                <br />
                Not a <span className="accent">photobox</span>
              </h1>

              <p className="hero-sub">
                fremio adalah <strong>cara baru</strong> merayakan momen. Pilih frame, bagikan ceritamu, dan <strong>tunjukkan versi dirimu</strong> dengan <strong>cara berbeda</strong>!
              </p>

              <NavLink
                to="/frames"
                className="cta-pink"
              >
                Get Started
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
            <h2 className="about-title">
              <span className="about-title-accent">About&nbsp;</span>
              <span className="about-title-main">fremio</span>
            </h2>

            <p className="about-tagline">Tangkap momen dengan cara yang berbeda!</p>

            <div className="space-y-8">
              <p className="about-text">
                Fremio melihat <strong>momen</strong> sebagai hal yang <strong>unique</strong>. Suatu hari kamu akan melihat ke belakang dan menyadari bahwa bukan <strong>momen besar</strong> yang paling penting, tapi <strong>momen sehari-hari</strong> yang mungkin biasa saja seperti tawa keluarga, candaan teman, atau tatapan lembut pasangan. Suatu hari <strong>rumah akan terasa sepi</strong>, tempat favoritmu terasa hambar. Hal yang paling penting adalah <strong>apa kamu benar-benar di sana</strong> saat itu semua terjadi. <strong>Mari berada di sana, bersama</strong>!
              </p>

              {/* Mission & Vision */}
              <div className="mv-grid">
                <div className="mv-card">
                  <div className="mv-icon">👁️</div>
                  <h3>Our Vision</h3>
                  <p>
                    Kami percaya setiap orang termasuk kamu punya cerita sendiri yang layak dirayakan. Fremio ingin menjadi temanmu dalam setiap cerita unik yang terjadi sehari-hari.
                  </p>
                </div>

                <div className="mv-card">
                  <div className="mv-icon">🎯</div>
                  <h3>Our Mission</h3>
                  <p>
                    Menyediakan berbagai frame yang pas untuk ceritamu setiap bulannya, sehingga kamu bisa mendapatkan momen yang terasa berbeda.
                  </p>
                </div>
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
