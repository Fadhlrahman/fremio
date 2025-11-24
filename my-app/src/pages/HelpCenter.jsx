import { useState } from "react";
import { Link } from "react-router-dom";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqCategories = [
    {
      title: "🎨 Getting Started",
      icon: "🚀",
      faqs: [
        {
          question: "Bagaimana cara membuat frame pertama saya?",
          answer:
            "Klik menu 'Frames' di navigasi atas, pilih template frame yang Anda suka, lalu klik 'Use This Frame'. Anda akan diarahkan ke halaman editor untuk menambahkan foto dan kustomisasi.",
        },
        {
          question: "Bagaimana cara upload foto?",
          answer:
            "Di halaman editor, klik tombol 'Add Photo' atau area kosong di frame. Anda bisa upload foto dari device, ambil foto langsung dengan kamera, atau pilih dari galeri yang sudah ada.",
        },
        {
          question: "Apakah saya perlu mendaftar untuk menggunakan Fremio?",
          answer:
            "Ya, Anda perlu membuat akun untuk menggunakan semua fitur Fremio. Registrasi gratis dan hanya memerlukan email dan password.",
        },
      ],
    },
    {
      title: "🖼️ Frames & Templates",
      icon: "🎭",
      faqs: [
        {
          question: "Berapa banyak slot foto yang bisa saya tambahkan?",
          answer:
            "Jumlah slot foto tergantung template frame yang Anda pilih. Setiap frame memiliki jumlah slot yang berbeda, dari 1 hingga 10 foto.",
        },
        {
          question: "Bisakah saya membuat custom frame sendiri?",
          answer:
            "Ya! Gunakan fitur 'Frame Builder' untuk membuat frame custom Anda sendiri. Anda bisa mengatur ukuran, posisi slot foto, dan menambahkan elemen dekoratif.",
        },
        {
          question: "Apakah saya bisa mengubah warna frame?",
          answer:
            "Ya, di halaman editor Anda bisa mengubah warna background frame, border, dan elemen dekoratif lainnya sesuai keinginan.",
        },
      ],
    },
    {
      title: "📸 Photo Editing",
      icon: "✨",
      faqs: [
        {
          question: "Bagaimana cara crop atau rotate foto?",
          answer:
            "Setelah upload foto, klik foto tersebut untuk membuka editor. Anda bisa drag untuk reposition, pinch/zoom untuk resize, dan gunakan tombol rotate untuk memutar foto.",
        },
        {
          question: "Bisakah saya menambahkan filter ke foto?",
          answer:
            "Ya, klik foto yang sudah di-upload, lalu pilih tab 'Filters' di panel editor. Tersedia berbagai filter seperti B&W, Sepia, Vintage, dan lainnya.",
        },
        {
          question: "Bagaimana cara menghapus foto dari frame?",
          answer:
            "Klik foto yang ingin dihapus, lalu klik tombol 'Remove' atau ikon trash di toolbar editor.",
        },
      ],
    },
    {
      title: "💾 Saving & Exporting",
      icon: "📥",
      faqs: [
        {
          question: "Bagaimana cara menyimpan project saya?",
          answer:
            "Klik tombol 'Save as Draft' untuk menyimpan project yang sedang dikerjakan. Semua draft tersimpan otomatis di akun Anda dan bisa diakses di menu 'Drafts'.",
        },
        {
          question: "Format apa yang bisa saya download?",
          answer:
            "Anda bisa download frame Anda dalam format PNG (gambar) atau MP4 (video slideshow dengan animasi).",
        },
        {
          question: "Berapa ukuran file maksimal untuk download?",
          answer:
            "File PNG: maksimal 10MB. File MP4: maksimal 50MB. Anda bisa adjust kualitas output untuk mengontrol ukuran file.",
        },
      ],
    },
    {
      title: "👤 Account & Settings",
      icon: "⚙️",
      faqs: [
        {
          question: "Bagaimana cara mengubah password saya?",
          answer:
            "Masuk ke menu 'Settings', pilih tab 'Security', lalu klik 'Change Password'. Masukkan password lama dan password baru Anda.",
        },
        {
          question: "Bagaimana cara mengganti foto profile?",
          answer:
            "Klik ikon profile di header, pilih 'Profile', lalu klik foto profile dan upload foto baru.",
        },
        {
          question: "Bisakah saya menghapus akun saya?",
          answer:
            "Ya, masuk ke 'Settings' > 'Account' > 'Delete Account'. Perhatikan bahwa ini akan menghapus semua data Anda secara permanen.",
        },
      ],
    },
    {
      title: "🔧 Troubleshooting",
      icon: "🛠️",
      faqs: [
        {
          question: "Foto saya tidak bisa di-upload, kenapa?",
          answer:
            "Pastikan foto berformat JPG, PNG, atau WEBP dengan ukuran maksimal 5MB. Cek juga koneksi internet Anda.",
        },
        {
          question: "Editor freeze atau lambat, bagaimana solusinya?",
          answer:
            "Coba refresh halaman atau clear browser cache. Jika masih lambat, coba kurangi jumlah foto atau gunakan foto dengan resolusi lebih kecil.",
        },
        {
          question: "Tidak bisa login, apa yang harus dilakukan?",
          answer:
            "Pastikan email dan password benar. Jika lupa password, klik 'Forgot Password' di halaman login. Jika masih bermasalah, hubungi support.",
        },
      ],
    },
  ];

  const filteredFaqs = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  const toggleFaq = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setExpandedFaq(expandedFaq === key ? null : key);
  };

  return (
    <section className="anchor help-center-wrap">
      <div className="container">
        {/* Header */}
        <div className="help-header">
          <h1>💡 Help Center</h1>
          <p>Temukan jawaban untuk pertanyaan Anda</p>
        </div>

        {/* Search Bar */}
        <div className="help-search">
          <div className="search-box">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Cari pertanyaan atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="quick-links">
          <h3>🔗 Quick Links</h3>
          <div className="quick-grid">
            <Link to="/frames" className="quick-card">
              <span className="quick-icon">🎨</span>
              <h4>Browse Frames</h4>
              <p>Lihat semua template</p>
            </Link>
            <Link to="/create" className="quick-card">
              <span className="quick-icon">➕</span>
              <h4>Create Frame</h4>
              <p>Mulai project baru</p>
            </Link>
            <Link to="/drafts" className="quick-card">
              <span className="quick-icon">📂</span>
              <h4>My Drafts</h4>
              <p>Lihat draft Anda</p>
            </Link>
            <Link to="/settings" className="quick-card">
              <span className="quick-icon">⚙️</span>
              <h4>Settings</h4>
              <p>Atur preferensi</p>
            </Link>
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="faq-sections">
          <h3>📚 Frequently Asked Questions</h3>

          {filteredFaqs.length === 0 ? (
            <div className="no-results">
              <p>🔍 Tidak ada hasil untuk "{searchQuery}"</p>
              <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                Coba kata kunci lain atau <a href="#contact">hubungi support</a>
              </p>
            </div>
          ) : (
            filteredFaqs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="faq-category">
                <h4 className="category-title">
                  <span className="category-icon">{category.icon}</span>
                  {category.title}
                </h4>
                <div className="faq-list">
                  {category.faqs.map((faq, faqIndex) => (
                    <div
                      key={faqIndex}
                      className={`faq-item ${
                        expandedFaq === `${categoryIndex}-${faqIndex}`
                          ? "expanded"
                          : ""
                      }`}
                    >
                      <button
                        className="faq-question"
                        onClick={() => toggleFaq(categoryIndex, faqIndex)}
                      >
                        <span>{faq.question}</span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="faq-arrow"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div id="contact" className="contact-support">
          <div className="contact-card">
            <h3>🤝 Masih Butuh Bantuan?</h3>
            <p>Tim support kami siap membantu Anda!</p>
            <div className="contact-methods">
              <a href="/call-center" className="contact-btn">
                📞 Call Center
              </a>
              <a href="mailto:fremioid@gmail.com" className="contact-btn">
                📧 Email Support
              </a>
              <a
                href="https://wa.me/6285387569977"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-btn"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .help-center-wrap {
          min-height: calc(100vh - 200px);
          padding: 40px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .help-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .help-header h1 {
          font-size: 2.5rem;
          margin-bottom: 12px;
          color: #111;
        }

        .help-header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        .help-search {
          max-width: 600px;
          margin: 0 auto 50px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 20px;
          transition: all 0.3s;
        }

        .search-box:focus-within {
          border-color: #e0b7a9;
          box-shadow: 0 0 0 3px rgba(224, 183, 169, 0.1);
        }

        .search-box svg {
          color: #94a3b8;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 1rem;
          color: #111;
        }

        .quick-links {
          margin-bottom: 60px;
        }

        .quick-links h3 {
          font-size: 1.5rem;
          margin-bottom: 24px;
          color: #111;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .quick-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          text-decoration: none;
          transition: all 0.3s;
          text-align: center;
        }

        .quick-card:hover {
          border-color: #e0b7a9;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .quick-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 12px;
        }

        .quick-card h4 {
          font-size: 1.1rem;
          margin-bottom: 6px;
          color: #111;
        }

        .quick-card p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        .faq-sections {
          margin-bottom: 60px;
        }

        .faq-sections > h3 {
          font-size: 1.5rem;
          margin-bottom: 30px;
          color: #111;
        }

        .faq-category {
          margin-bottom: 40px;
        }

        .category-title {
          font-size: 1.3rem;
          margin-bottom: 20px;
          color: #111;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .category-icon {
          font-size: 1.8rem;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .faq-item:hover {
          border-color: #cbd5e1;
        }

        .faq-item.expanded {
          border-color: #e0b7a9;
        }

        .faq-question {
          width: 100%;
          padding: 18px 20px;
          background: none;
          border: none;
          text-align: left;
          font-size: 1rem;
          font-weight: 600;
          color: #111;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
        }

        .faq-question:hover {
          background: #f8f9fa;
        }

        .faq-arrow {
          flex-shrink: 0;
          transition: transform 0.3s;
        }

        .faq-item.expanded .faq-arrow {
          transform: rotate(180deg);
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .faq-item.expanded .faq-answer {
          max-height: 500px;
        }

        .faq-answer p {
          padding: 0 20px 20px;
          margin: 0;
          color: #475569;
          line-height: 1.6;
        }

        .no-results {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 2px dashed #e2e8f0;
        }

        .no-results p:first-child {
          font-size: 1.1rem;
          margin-bottom: 8px;
        }

        .contact-support {
          margin-top: 60px;
        }

        .contact-card {
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          padding: 50px 30px;
          border-radius: 16px;
          text-align: center;
          color: white;
        }

        .contact-card h3 {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .contact-card > p {
          font-size: 1.1rem;
          margin-bottom: 30px;
          opacity: 0.95;
        }

        .contact-methods {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .contact-btn {
          padding: 14px 28px;
          background: white;
          color: #c89585;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .contact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 768px) {
          .help-header h1 {
            font-size: 2rem;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }

          .contact-methods {
            flex-direction: column;
          }

          .contact-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
