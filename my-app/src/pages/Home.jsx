import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import frame1 from "../assets/frame1.png";
import frame2 from "../assets/frame2.png";
import frame3 from "../assets/frame3.png";

export default function Home() {
  const { isAuthenticated } = useAuth();

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
                fremio adalah cara baru merayakan momen. Pilih frame, cetak
                instan, dan jadikan kenanganmu sesuatu yang hidup
              </p>

              <NavLink
                to={isAuthenticated ? "/frames" : "/login"}
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
              <span className="about-title-accent">🎨 About&nbsp;</span>
              <span className="about-title-main">Fremio</span>
            </h2>

            <p className="about-tagline">Think Outside The Box!</p>

            <div className="space-y-8">
              <p className="about-text">
                Fremio adalah platform inovatif yang memudahkan siapa saja untuk
                membuat photo frames yang indah dan personal. Kami percaya
                setiap momen berharga untuk diabadikan dengan cara yang unik dan
                creative.
              </p>

              {/* Mission & Vision */}
              <div className="mv-grid">
                <div className="mv-card">
                  <div className="mv-icon">🎯</div>
                  <h3>Our Mission</h3>
                  <p>
                    Memberdayakan setiap orang untuk mengekspresikan kreativitas
                    mereka melalui photo frames yang personal dan bermakna. Kami
                    ingin membuat proses pembuatan frame menjadi mudah,
                    menyenangkan, dan accessible untuk semua.
                  </p>
                </div>

                <div className="mv-card">
                  <div className="mv-icon">👁️</div>
                  <h3>Our Vision</h3>
                  <p>
                    Menjadi platform #1 di Indonesia untuk photo frame creation,
                    di mana setiap orang bisa mewujudkan ide creative mereka dan
                    membagikan memories yang berharga dengan cara yang unique
                    dan inspiring.
                  </p>
                </div>
              </div>

              {/* Values */}
              <div className="values-section-home">
                <h2 className="section-title">💎 Our Values</h2>
                <div className="values-grid-home">
                  <div className="value-card-home">
                    <div className="value-icon-home">🚀</div>
                    <h4>Innovation</h4>
                    <p>Terus berinovasi untuk memberikan pengalaman terbaik</p>
                  </div>

                  <div className="value-card-home">
                    <div className="value-icon-home">❤️</div>
                    <h4>User-Centric</h4>
                    <p>
                      User adalah prioritas utama dalam setiap keputusan kami
                    </p>
                  </div>

                  <div className="value-card-home">
                    <div className="value-icon-home">🎨</div>
                    <h4>Creativity</h4>
                    <p>Mendorong kreativitas tanpa batas untuk semua user</p>
                  </div>

                  <div className="value-card-home">
                    <div className="value-icon-home">🤝</div>
                    <h4>Community</h4>
                    <p>Membangun komunitas yang supportive dan collaborative</p>
                  </div>

                  <div className="value-card-home">
                    <div className="value-icon-home">⚡</div>
                    <h4>Quality</h4>
                    <p>Mengutamakan kualitas dalam setiap aspek produk</p>
                  </div>

                  <div className="value-card-home">
                    <div className="value-icon-home">🌱</div>
                    <h4>Growth</h4>
                    <p>Bertumbuh bersama dengan komunitas dan technology</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="timeline-section-home">
                <h2 className="section-title">📅 Our Journey</h2>
                <div className="timeline-home">
                  <div className="timeline-item-home">
                    <div className="timeline-year-home">2023</div>
                    <div className="timeline-content-home">
                      <h4>Fremio Didirikan</h4>
                      <p>
                        Memulai perjalanan untuk revolutionize cara orang
                        membuat frame foto
                      </p>
                    </div>
                  </div>

                  <div className="timeline-item-home">
                    <div className="timeline-year-home">2024</div>
                    <div className="timeline-content-home">
                      <h4>10K+ Users</h4>
                      <p>
                        Mencapai milestone 10.000 users aktif di seluruh
                        Indonesia
                      </p>
                    </div>
                  </div>

                  <div className="timeline-item-home">
                    <div className="timeline-year-home">2024</div>
                    <div className="timeline-content-home">
                      <h4>Frame Builder Launch</h4>
                      <p>
                        Meluncurkan fitur custom frame builder untuk kreativitas
                        tanpa batas
                      </p>
                    </div>
                  </div>

                  <div className="timeline-item-home">
                    <div className="timeline-year-home">2025</div>
                    <div className="timeline-content-home">
                      <h4>AI Integration</h4>
                      <p>
                        Mengintegrasikan AI untuk auto-detect faces dan smart
                        frame suggestions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div className="team-section-home">
                <h2 className="section-title">👥 Meet Our Team</h2>
                <p className="team-subtitle-home">
                  Tim passionate yang bekerja untuk membuat Fremio lebih baik
                  setiap hari
                </p>
                <div className="team-grid-home">
                  <div className="team-card-home">
                    <div className="member-photo-home">👨‍💼</div>
                    <h4>Razzaqu Raydan</h4>
                    <p className="member-role-home">Founder & CEO</p>
                    <p className="member-bio-home">
                      Visioner di balik Fremio dengan passion untuk fotografi
                      dan teknologi.
                    </p>
                  </div>

                  <div className="team-card-home">
                    <div className="member-photo-home">👩‍🎨</div>
                    <h4>Sarah Wijaya</h4>
                    <p className="member-role-home">Creative Director</p>
                    <p className="member-bio-home">
                      Mendesain experience yang memorable untuk setiap user.
                    </p>
                  </div>

                  <div className="team-card-home">
                    <div className="member-photo-home">👨‍💻</div>
                    <h4>Budi Santoso</h4>
                    <p className="member-role-home">Lead Developer</p>
                    <p className="member-bio-home">
                      Membangun teknologi yang membuat Fremio semakin powerful.
                    </p>
                  </div>

                  <div className="team-card-home">
                    <div className="member-photo-home">👩‍💼</div>
                    <h4>Rina Putri</h4>
                    <p className="member-role-home">Marketing Manager</p>
                    <p className="member-bio-home">
                      Membawa Fremio ke lebih banyak orang di seluruh Indonesia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">15K+</div>
                  <div className="stat-label">Active Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">50K+</div>
                  <div className="stat-label">Frames Created</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">200+</div>
                  <div className="stat-label">Templates</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">4.8⭐</div>
                  <div className="stat-label">User Rating</div>
                </div>
              </div>

              {/* CTA */}
              <div className="cta-section-home">
                <h2>🚀 Join Us on This Journey</h2>
                <p>Mulai ciptakan frame yang amazing sekarang!</p>
                <div className="cta-buttons-home">
                  <a href="/frames" className="cta-btn-home primary">
                    Explore Frames
                  </a>
                  <a href="/register" className="cta-btn-home secondary">
                    Create Account
                  </a>
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
