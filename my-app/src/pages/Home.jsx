import { NavLink } from "react-router-dom";
import frame1 from "../assets/frame1.png";
import frame2 from "../assets/frame2.png";
import frame3 from "../assets/frame3.png";

export default function Home() {
  return (
    <>
      {/* ======= HERO (/#home) ======= */}
      <section
        id="home"
        className="hero-fremio"
        style={{ scrollMarginTop: "64px" }}
      >
        <div className="container hero-grid">
          {/* LEFT */}
          <div className="hero-left">
            <h1 className="hero-h1">
              Not a <span className="accent">photobooth</span>
              <br />
              Not a <span className="accent">photobox</span>
            </h1>

            <p className="hero-sub">
              fremio adalah cara baru merayakan momen. Pilih frame, cetak
              instan, dan jadikan kenanganmu sesuatu yang hidup
            </p>

            <NavLink to="/login" className="cta-pink">
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
            <img src={frame1} alt="Contoh frame utama" className="shot main" />
            <img src={frame2} alt="Contoh frame kiri" className="shot left" />
            <img src={frame3} alt="Contoh frame kanan" className="shot right" />
          </div>
        </div>
      </section>

      {/* ======= ABOUT (/#about) ======= */}
      <section
        id="about"
        className="container pad"
        style={{ scrollMarginTop: "64px" }}
      >
        <div className="mt-10 px-8">
          <h2 className="mb-8">
            <span
              className="font-bold"
              style={{ color: "#D9B9AB", fontSize: "2rem", lineHeight: "1" }}
            >
              Tentang&nbsp;
            </span>
            <span
              className="font-bold text-black"
              style={{ fontSize: "2rem", lineHeight: "1" }}
            >
              Kami
            </span>
          </h2>

          <div className="space-y-8 text-xl text-black">
            <p>
              Kami percaya bahwa setiap momen berharga layak untuk diabadikan
              dengan cara yang istimewa.
              <br />
              Fremio hadir bukan sekadar photobooth atau photobox, tapi sebuah
              pengalaman baru dalam merayakan kenangan.
            </p>

            <p>
              Dengan Fremio, kamu bisa memilih frame yang unik, mencetak foto
              instan, dan menyimpannya sebagai bagian dari cerita hidupmu.
              <br />
              Kami menghubungkan kreator desain, coffee shop, dan komunitas
              dalam satu ekosistem yang membuat kenangan terasa lebih hidup,
              personal, dan bermakna.
            </p>

            <p>
              Purpose kami sederhana:{" "}
              <span className="font-bold text-black text-xl">
                We help people cherish what matters most.
              </span>
              <br />
              Kami ingin menjadikan foto bukan sekadar gambar, tapi sebuah
              pengalaman emosional yang bisa kamu sentuh, bagikan, dan kenang
              selamanya.
            </p>
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
