import { useState } from "react";
import { submitContactMessage } from "../services/contactMessageService";
import { useToast } from "../hooks/useToast";

export default function CallCenter() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      console.log("🚀 Submitting contact message:", formData);
      const result = await submitContactMessage(formData);
      console.log("✅ Message submitted successfully:", result);
      console.log(
        "📦 LocalStorage after submit:",
        JSON.parse(localStorage.getItem("contact_messages") || "[]")
      );

      showToast(
        "✅ Pesan berhasil dikirim! Tim kami akan menghubungi Anda segera.",
        "success"
      );

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        topic: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting message:", error);
      showToast("❌ Gagal mengirim pesan. Silakan coba lagi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const topics = [
    {
      value: "technical",
      label: "🔧 Technical Support",
      desc: "Masalah teknis atau bug",
    },
    {
      value: "account",
      label: "👤 Account Issues",
      desc: "Login, password, profile",
    },
    {
      value: "billing",
      label: "💳 Billing & Payments",
      desc: "Pembayaran dan langganan",
    },
    { value: "general", label: "❓ General Inquiry", desc: "Pertanyaan umum" },
    {
      value: "feedback",
      label: "💬 Feedback & Suggestions",
      desc: "Saran dan masukan",
    },
  ];

  return (
    <section className="anchor call-center-wrap">
      <div className="container">
        {/* Header */}
        <div className="cc-header">
          <h1>📞 Call Center</h1>
          <p>Hubungi kami untuk bantuan langsung</p>
        </div>

        <div className="cc-grid">
          {/* Contact Info */}
          <div className="cc-sidebar">
            <div className="info-card">
              <h3>📱 Contact Information</h3>

              <div className="contact-item">
                <div className="contact-icon">📞</div>
                <div className="contact-details">
                  <h4>Phone</h4>
                  <a href="tel:+6285387569977">+62 853 8756 9977</a>
                  <p>Senin - Jumat: 9:00 - 18:00 WIB</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">📧</div>
                <div className="contact-details">
                  <h4>Email</h4>
                  <a href="mailto:fremioid@gmail.com">fremioid@gmail.com</a>
                  <p>Response dalam 24 jam</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">💬</div>
                <div className="contact-details">
                  <h4>WhatsApp</h4>
                  <a
                    href="https://wa.me/6285387569977"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Chat di WhatsApp
                  </a>
                  <p>Fast response</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">📍</div>
                <div className="contact-details">
                  <h4>Office</h4>
                  <p style={{ margin: 0, color: "#475569" }}>
                    Jalan Asep Berlian Gang Bunga 2 no.1,
                    <br />
                    Cicadas, Kota Bandung
                  </p>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="info-card">
              <h3>🕐 Business Hours</h3>
              <div className="hours-list">
                <div className="hours-item">
                  <span>Senin - Jumat</span>
                  <strong>09:00 - 18:00</strong>
                </div>
                <div className="hours-item">
                  <span>Sabtu</span>
                  <strong>10:00 - 15:00</strong>
                </div>
                <div className="hours-item">
                  <span>Minggu & Libur</span>
                  <strong>Tutup</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="cc-main">
            <div className="form-card">
              <h3>✉️ Send Us a Message</h3>
              <p>Isi form di bawah dan tim kami akan menghubungi Anda</p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nama Lengkap *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+62 812 3456 7890"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Topik *</label>
                  <select
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Pilih Topik --</option>
                    {topics.map((topic) => (
                      <option key={topic.value} value={topic.value}>
                        {topic.label} - {topic.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pesan *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Jelaskan masalah atau pertanyaan Anda di sini..."
                    rows="6"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "📤 Mengirim..." : "📤 Kirim Pesan"}
                </button>
              </form>
            </div>

            {/* Quick Topics */}
            <div className="topics-grid">
              <h4>💡 Topik Populer</h4>
              <div className="topics-list">
                {topics.map((topic) => (
                  <div key={topic.value} className="topic-chip">
                    <span>{topic.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .call-center-wrap {
          min-height: calc(100vh - 200px);
          padding: 40px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .cc-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .cc-header h1 {
          font-size: 2.5rem;
          margin-bottom: 12px;
          color: #111;
        }

        .cc-header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        .cc-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 30px;
          align-items: start;
        }

        .info-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .info-card h3 {
          font-size: 1.3rem;
          margin-bottom: 24px;
          color: #111;
        }

        .contact-item {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .contact-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .contact-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .contact-details h4 {
          font-size: 1rem;
          margin-bottom: 6px;
          color: #111;
        }

        .contact-details a {
          color: #e0b7a9;
          text-decoration: none;
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
        }

        .contact-details a:hover {
          text-decoration: underline;
        }

        .contact-details p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .hours-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hours-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .hours-item span {
          color: #64748b;
        }

        .hours-item strong {
          color: #111;
        }

        .form-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          margin-bottom: 30px;
        }

        .form-card h3 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          color: #111;
        }

        .form-card > p {
          color: #64748b;
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #334155;
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          color: #111;
          transition: all 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #e0b7a9;
          box-shadow: 0 0 0 3px rgba(224, 183, 169, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          font-family: inherit;
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(200, 149, 133, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .topics-grid {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .topics-grid h4 {
          font-size: 1.2rem;
          margin-bottom: 16px;
          color: #111;
        }

        .topics-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .topic-chip {
          padding: 10px 16px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #475569;
        }

        @media (max-width: 1024px) {
          .cc-grid {
            grid-template-columns: 1fr;
          }

          .cc-sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .cc-header h1 {
            font-size: 2rem;
          }

          .cc-sidebar {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-card {
            padding: 24px;
          }
        }
      `}</style>
    </section>
  );
}
