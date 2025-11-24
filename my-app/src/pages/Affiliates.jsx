import { useState } from "react";

export default function Affiliates() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    platform: "",
    followers: "",
    niche: "",
    message: "",
  });

  const benefits = [
    {
      icon: "💰",
      title: "High Commission",
      desc: "Earn up to 30% commission on every sale",
    },
    {
      icon: "📈",
      title: "Recurring Revenue",
      desc: "Earn from subscription renewals every month",
    },
    {
      icon: "🎁",
      title: "Exclusive Bonuses",
      desc: "Special rewards for top performers",
    },
    {
      icon: "📊",
      title: "Real-time Analytics",
      desc: "Track your earnings and performance live",
    },
    {
      icon: "🎨",
      title: "Marketing Materials",
      desc: "Professional banners, templates, and assets",
    },
    {
      icon: "🤝",
      title: "Dedicated Support",
      desc: "Personal affiliate manager for assistance",
    },
  ];

  const tiers = [
    {
      name: "Starter",
      sales: "0-10 sales/month",
      commission: "20%",
      features: [
        "Basic affiliate dashboard",
        "Standard marketing materials",
        "Email support",
        "Weekly payouts",
      ],
    },
    {
      name: "Pro",
      sales: "11-50 sales/month",
      commission: "25%",
      features: [
        "Advanced analytics",
        "Premium marketing kit",
        "Priority support",
        "Bi-weekly payouts",
        "Custom discount codes",
      ],
      popular: true,
    },
    {
      name: "Elite",
      sales: "50+ sales/month",
      commission: "30%",
      features: [
        "Dedicated account manager",
        "Exclusive templates access",
        "24/7 support",
        "Instant payouts",
        "Co-marketing opportunities",
        "Early feature access",
      ],
    },
  ];

  const faqs = [
    {
      q: "Bagaimana cara bergabung dengan program affiliate?",
      a: "Cukup isi form aplikasi di halaman ini. Tim kami akan review aplikasi Anda dalam 2-3 hari kerja dan mengirim email konfirmasi jika diterima.",
    },
    {
      q: "Berapa komisi yang saya dapatkan?",
      a: "Komisi dimulai dari 20% untuk Starter tier, 25% untuk Pro, dan 30% untuk Elite. Anda juga mendapat komisi recurring dari subscription renewal.",
    },
    {
      q: "Kapan saya menerima pembayaran?",
      a: "Pembayaran dilakukan setiap minggu untuk Starter, bi-weekly untuk Pro, dan instant untuk Elite tier. Minimum payout adalah Rp 500.000.",
    },
    {
      q: "Apakah ada biaya untuk bergabung?",
      a: "Tidak ada biaya! Program affiliate Fremio 100% gratis untuk bergabung.",
    },
    {
      q: "Berapa lama cookie tracking berlaku?",
      a: "Cookie tracking berlaku selama 30 hari. Artinya jika user klik link Anda dan membeli dalam 30 hari, Anda tetap dapat komisi.",
    },
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      "Terima kasih! Aplikasi Anda telah diterima. Kami akan menghubungi Anda dalam 2-3 hari kerja."
    );
    setFormData({
      name: "",
      email: "",
      website: "",
      platform: "",
      followers: "",
      niche: "",
      message: "",
    });
  };

  return (
    <section className="anchor affiliates-wrap">
      <div className="container">
        {/* Hero */}
        <div className="aff-hero">
          <h1>🤝 Affiliate Program</h1>
          <p className="subtitle">
            Partner dengan Fremio dan earn passive income
          </p>
          <div className="hero-highlights">
            <div className="highlight">
              <strong>30%</strong>
              <span>Max Commission</span>
            </div>
            <div className="highlight">
              <strong>30 Days</strong>
              <span>Cookie Duration</span>
            </div>
            <div className="highlight">
              <strong>$50K+</strong>
              <span>Monthly Earnings Potential</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="section">
          <h2>✨ Why Join Our Affiliate Program?</h2>
          <div className="benefits-grid">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">{benefit.icon}</div>
                <h3>{benefit.title}</h3>
                <p>{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Commission Tiers */}
        <div className="section">
          <h2>🏆 Commission Tiers</h2>
          <div className="tiers-grid">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`tier-card ${tier.popular ? "popular" : ""}`}
              >
                {tier.popular && (
                  <div className="popular-badge">Most Popular</div>
                )}
                <h3>{tier.name}</h3>
                <div className="tier-sales">{tier.sales}</div>
                <div className="tier-commission">{tier.commission}</div>
                <div className="tier-label">Commission Rate</div>
                <ul className="tier-features">
                  {tier.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="section">
          <h2>📋 How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h4>Apply</h4>
              <p>Fill out the application form below with your details</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h4>Get Approved</h4>
              <p>We review your application within 2-3 business days</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h4>Promote</h4>
              <p>Share your unique affiliate link and marketing materials</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h4>Earn</h4>
              <p>Get paid commission for every successful referral</p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="section">
          <div className="form-section">
            <h2>📝 Apply Now</h2>
            <p className="form-intro">
              Join hundreds of creators earning with Fremio
            </p>

            <form onSubmit={handleSubmit} className="aff-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Website/Blog URL</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="form-group">
                  <label>Main Platform *</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Platform --</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="blog">Blog/Website</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Followers/Subscribers *</label>
                  <select
                    name="followers"
                    value={formData.followers}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Range --</option>
                    <option value="<1k">&lt; 1,000</option>
                    <option value="1k-10k">1,000 - 10,000</option>
                    <option value="10k-50k">10,000 - 50,000</option>
                    <option value="50k-100k">50,000 - 100,000</option>
                    <option value=">100k">&gt; 100,000</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Your Niche *</label>
                  <select
                    name="niche"
                    value={formData.niche}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Niche --</option>
                    <option value="photography">Photography</option>
                    <option value="design">Design/Creative</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="tech">Technology</option>
                    <option value="education">Education</option>
                    <option value="business">Business/Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Why do you want to join? *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about yourself and why you'd be a great affiliate partner..."
                  rows="5"
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                🚀 Submit Application
              </button>
            </form>
          </div>
        </div>

        {/* FAQ */}
        <div className="section">
          <h2>❓ Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <h4>{faq.q}</h4>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="contact-cta">
          <h2>💬 Have Questions?</h2>
          <p>Our affiliate team is here to help you succeed</p>
          <div className="contact-buttons">
            <a href="mailto:affiliates@fremio.com" className="contact-btn">
              📧 Email Us
            </a>
            <a href="/call-center" className="contact-btn">
              📞 Contact Support
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .affiliates-wrap {
          min-height: calc(100vh - 200px);
          padding: 60px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .aff-hero {
          text-align: center;
          margin-bottom: 80px;
        }

        .aff-hero h1 {
          font-size: 3rem;
          margin-bottom: 16px;
          color: #111;
        }

        .subtitle {
          font-size: 1.3rem;
          color: #64748b;
          margin-bottom: 40px;
        }

        .hero-highlights {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          max-width: 900px;
          margin: 0 auto;
        }

        .highlight {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .highlight strong {
          font-size: 2.5rem;
          color: #e0b7a9;
          margin-bottom: 8px;
        }

        .highlight span {
          font-size: 0.95rem;
          color: #64748b;
        }

        .section {
          margin-bottom: 80px;
        }

        .section h2 {
          font-size: 2.2rem;
          text-align: center;
          margin-bottom: 40px;
          color: #111;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .benefit-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }

        .benefit-card:hover {
          border-color: #e0b7a9;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .benefit-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .benefit-card h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #111;
        }

        .benefit-card p {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .tier-card {
          background: white;
          padding: 40px 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          position: relative;
          transition: all 0.3s;
        }

        .tier-card.popular {
          border-color: #e0b7a9;
          box-shadow: 0 8px 30px rgba(224, 183, 169, 0.2);
        }

        .tier-card:hover {
          transform: translateY(-4px);
        }

        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          color: white;
          padding: 6px 20px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .tier-card h3 {
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: #111;
          text-align: center;
        }

        .tier-sales {
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .tier-commission {
          font-size: 3rem;
          font-weight: 700;
          color: #e0b7a9;
          text-align: center;
          margin-bottom: 8px;
        }

        .tier-label {
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        .tier-features {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tier-features li {
          padding: 10px 0;
          color: #475569;
          font-size: 0.95rem;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
          gap: 20px;
          align-items: center;
        }

        .step-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          text-align: center;
        }

        .step-number {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 auto 16px;
        }

        .step-card h4 {
          font-size: 1.2rem;
          margin-bottom: 8px;
          color: #111;
        }

        .step-card p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        .step-arrow {
          font-size: 2rem;
          color: #e0b7a9;
          font-weight: 700;
        }

        .form-section {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 50px;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
        }

        .form-section h2 {
          margin-bottom: 12px;
        }

        .form-intro {
          text-align: center;
          color: #64748b;
          margin-bottom: 40px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #334155;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
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

        .faq-list {
          max-width: 900px;
          margin: 0 auto;
        }

        .faq-item {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .faq-item h4 {
          font-size: 1.1rem;
          margin-bottom: 12px;
          color: #111;
        }

        .faq-item p {
          font-size: 0.95rem;
          color: #475569;
          margin: 0;
          line-height: 1.6;
        }

        .contact-cta {
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          padding: 60px;
          border-radius: 16px;
          text-align: center;
          color: white;
        }

        .contact-cta h2 {
          font-size: 2.2rem;
          margin-bottom: 12px;
          color: white;
        }

        .contact-cta > p {
          font-size: 1.1rem;
          margin-bottom: 30px;
          opacity: 0.95;
        }

        .contact-buttons {
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

        @media (max-width: 1024px) {
          .benefits-grid,
          .tiers-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .steps-grid {
            grid-template-columns: 1fr;
          }

          .step-arrow {
            transform: rotate(90deg);
          }
        }

        @media (max-width: 768px) {
          .aff-hero h1 {
            font-size: 2.2rem;
          }

          .hero-highlights {
            grid-template-columns: 1fr;
          }

          .benefits-grid,
          .tiers-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .form-section {
            padding: 30px 20px;
          }

          .contact-buttons {
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
