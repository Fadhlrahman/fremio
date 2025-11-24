export default function Investor() {
  const financialHighlights = [
    { metric: "Revenue Growth", value: "+150%", period: "YoY 2024" },
    { metric: "Active Users", value: "15,000+", period: "Q4 2024" },
    {
      metric: "Monthly Recurring Revenue",
      value: "$50K",
      period: "November 2025",
    },
    { metric: "Customer Retention", value: "85%", period: "2024 Average" },
  ];

  const investmentReasons = [
    {
      icon: "📈",
      title: "Rapid Growth",
      desc: "150% YoY user growth with strong market traction in Indonesia",
    },
    {
      icon: "🎯",
      title: "Clear Vision",
      desc: "Becoming the #1 photo frame platform in Southeast Asia by 2026",
    },
    {
      icon: "💰",
      title: "Monetization Strategy",
      desc: "Multiple revenue streams: Premium templates, subscriptions, and enterprise",
    },
    {
      icon: "🌏",
      title: "Market Opportunity",
      desc: "$500M+ addressable market in photo editing and creative tools",
    },
    {
      icon: "🚀",
      title: "Innovation",
      desc: "AI-powered features and cutting-edge technology stack",
    },
    {
      icon: "👥",
      title: "Strong Team",
      desc: "Experienced founders with track record in tech and creative industries",
    },
  ];

  const milestones = [
    {
      quarter: "Q1 2024",
      achievements: [
        "Launched beta version",
        "Acquired first 1,000 users",
        "Seed funding: $500K",
      ],
    },
    {
      quarter: "Q2 2024",
      achievements: [
        "10,000 active users",
        "Premium tier launch",
        "Partnerships with 5 brands",
      ],
    },
    {
      quarter: "Q3 2024",
      achievements: [
        "Series A funding: $2M",
        "Team expansion to 15",
        "Mobile app launch",
      ],
    },
    {
      quarter: "Q4 2024",
      achievements: [
        "15,000 active users",
        "B2B enterprise offering",
        "Revenue: $50K MRR",
      ],
    },
  ];

  const useCases = [
    {
      title: "Monthly Subscription",
      price: "$9.99/mo",
      features: [
        "Unlimited frames",
        "Premium templates",
        "HD exports",
        "Priority support",
      ],
    },
    {
      title: "Enterprise License",
      price: "Custom",
      features: [
        "White-label solution",
        "API access",
        "Dedicated support",
        "Custom integration",
      ],
    },
    {
      title: "Marketplace Revenue",
      price: "30% commission",
      features: [
        "User-created templates",
        "Designer partnerships",
        "Revenue sharing",
        "Quality curation",
      ],
    },
  ];

  return (
    <section className="anchor investor-wrap">
      <div className="container">
        {/* Hero */}
        <div className="investor-hero">
          <h1>💼 Investor Relations</h1>
          <p className="subtitle">
            Join us in revolutionizing the photo frame industry
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-value">$2.5M</div>
              <div className="stat-label">Total Funding Raised</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value">150%</div>
              <div className="stat-label">YoY Growth</div>
            </div>
            <div className="hero-stat">
              <div className="stat-value">15K+</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
        </div>

        {/* Why Invest */}
        <div className="section">
          <h2>🎯 Why Invest in Fremio?</h2>
          <div className="reasons-grid">
            {investmentReasons.map((reason, index) => (
              <div key={index} className="reason-card">
                <div className="reason-icon">{reason.icon}</div>
                <h3>{reason.title}</h3>
                <p>{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="section">
          <h2>📊 Financial Highlights</h2>
          <div className="financial-grid">
            {financialHighlights.map((item, index) => (
              <div key={index} className="financial-card">
                <div className="financial-metric">{item.metric}</div>
                <div className="financial-value">{item.value}</div>
                <div className="financial-period">{item.period}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Streams */}
        <div className="section">
          <h2>💰 Revenue Streams</h2>
          <div className="revenue-grid">
            {useCases.map((useCase, index) => (
              <div key={index} className="revenue-card">
                <h3>{useCase.title}</h3>
                <div className="revenue-price">{useCase.price}</div>
                <ul className="revenue-features">
                  {useCase.features.map((feature, i) => (
                    <li key={i}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="section">
          <h2>🚀 Growth Milestones</h2>
          <div className="milestones-timeline">
            {milestones.map((milestone, index) => (
              <div key={index} className="milestone-card">
                <div className="milestone-quarter">{milestone.quarter}</div>
                <ul className="milestone-achievements">
                  {milestone.achievements.map((achievement, i) => (
                    <li key={i}>{achievement}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Market Opportunity */}
        <div className="section market-section">
          <h2>🌏 Market Opportunity</h2>
          <div className="market-content">
            <div className="market-text">
              <h3>$500M+ Addressable Market</h3>
              <p>
                The photo editing and creative tools market in Southeast Asia is
                experiencing rapid growth, with 200M+ smartphone users and
                increasing demand for personalized digital content.
              </p>
              <ul className="market-points">
                <li>📱 85% mobile internet penetration in Indonesia</li>
                <li>🎨 Growing creator economy: $104B globally</li>
                <li>📸 Photo editing market: 15% CAGR</li>
                <li>🌟 Limited competition in localized frame tools</li>
              </ul>
            </div>
            <div className="market-chart">
              <div className="chart-placeholder">
                <div className="chart-bar" style={{ height: "40%" }}>
                  <span>2023</span>
                  <strong>$200M</strong>
                </div>
                <div className="chart-bar" style={{ height: "65%" }}>
                  <span>2024</span>
                  <strong>$325M</strong>
                </div>
                <div className="chart-bar" style={{ height: "100%" }}>
                  <span>2025</span>
                  <strong>$500M</strong>
                </div>
              </div>
              <p className="chart-label">Market Size Projection</p>
            </div>
          </div>
        </div>

        {/* Team Credentials */}
        <div className="section">
          <h2>👥 Leadership Team</h2>
          <div className="team-credentials">
            <div className="credential-card">
              <div className="credential-icon">🎓</div>
              <h4>Education</h4>
              <p>Top universities: ITB, UI, NUS</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">💼</div>
              <h4>Experience</h4>
              <p>Ex-Gojek, Tokopedia, Google</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">🏆</div>
              <h4>Achievements</h4>
              <p>Built & scaled products to 1M+ users</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">🌟</div>
              <h4>Recognition</h4>
              <p>Forbes 30 Under 30 nominees</p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="investor-cta">
          <h2>📩 Interested in Investing?</h2>
          <p>Get access to our investor deck and financial projections</p>
          <div className="cta-buttons">
            <a href="mailto:investors@fremio.com" className="cta-btn primary">
              Request Investor Deck
            </a>
            <a href="/call-center" className="cta-btn secondary">
              Schedule a Call
            </a>
          </div>
          <p className="disclaimer">
            * Investment opportunities are subject to regulatory compliance and
            accredited investor verification
          </p>
        </div>
      </div>

      <style jsx>{`
        .investor-wrap {
          min-height: calc(100vh - 200px);
          padding: 60px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .investor-hero {
          text-align: center;
          margin-bottom: 80px;
        }

        .investor-hero h1 {
          font-size: 3rem;
          margin-bottom: 16px;
          color: #111;
        }

        .subtitle {
          font-size: 1.3rem;
          color: #64748b;
          margin-bottom: 40px;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          max-width: 900px;
          margin: 0 auto;
        }

        .hero-stat {
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          padding: 30px;
          border-radius: 12px;
          color: white;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 1rem;
          opacity: 0.95;
        }

        .section {
          margin-bottom: 80px;
        }

        .section h2 {
          font-size: 2.2rem;
          margin-bottom: 40px;
          color: #111;
          text-align: center;
        }

        .reasons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .reason-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }

        .reason-card:hover {
          border-color: #e0b7a9;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .reason-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .reason-card h3 {
          font-size: 1.3rem;
          margin-bottom: 10px;
          color: #111;
        }

        .reason-card p {
          font-size: 0.95rem;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }

        .financial-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .financial-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          text-align: center;
        }

        .financial-metric {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .financial-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #e0b7a9;
          margin-bottom: 8px;
        }

        .financial-period {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .revenue-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .revenue-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .revenue-card h3 {
          font-size: 1.3rem;
          margin-bottom: 16px;
          color: #111;
        }

        .revenue-price {
          font-size: 2rem;
          font-weight: 700;
          color: #e0b7a9;
          margin-bottom: 20px;
        }

        .revenue-features {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .revenue-features li {
          padding: 8px 0;
          color: #475569;
          font-size: 0.95rem;
        }

        .milestones-timeline {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .milestone-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .milestone-quarter {
          font-size: 1.3rem;
          font-weight: 700;
          color: #e0b7a9;
          margin-bottom: 16px;
        }

        .milestone-achievements {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .milestone-achievements li {
          padding: 6px 0;
          color: #475569;
          font-size: 0.9rem;
          border-left: 3px solid #e0b7a9;
          padding-left: 12px;
          margin-bottom: 8px;
        }

        .market-section {
          background: white;
          padding: 50px;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
        }

        .market-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          align-items: center;
        }

        .market-text h3 {
          font-size: 1.8rem;
          margin-bottom: 16px;
          color: #111;
        }

        .market-text > p {
          font-size: 1.05rem;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 24px;
        }

        .market-points {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .market-points li {
          padding: 10px 0;
          font-size: 1rem;
          color: #334155;
        }

        .chart-placeholder {
          display: flex;
          gap: 30px;
          align-items: flex-end;
          justify-content: center;
          height: 300px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .chart-bar {
          flex: 1;
          background: linear-gradient(to top, #e0b7a9, #c89585);
          border-radius: 8px 8px 0 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 16px;
          color: white;
          position: relative;
        }

        .chart-bar span {
          position: absolute;
          bottom: -30px;
          font-size: 0.9rem;
          color: #64748b;
        }

        .chart-bar strong {
          font-size: 1.2rem;
        }

        .chart-label {
          text-align: center;
          margin-top: 40px;
          color: #64748b;
          font-size: 0.95rem;
        }

        .team-credentials {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .credential-card {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          text-align: center;
        }

        .credential-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .credential-card h4 {
          font-size: 1.2rem;
          margin-bottom: 8px;
          color: #111;
        }

        .credential-card p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        .investor-cta {
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          padding: 60px;
          border-radius: 16px;
          text-align: center;
          color: white;
        }

        .investor-cta h2 {
          font-size: 2.2rem;
          margin-bottom: 12px;
          color: white;
        }

        .investor-cta > p {
          font-size: 1.1rem;
          margin-bottom: 30px;
          opacity: 0.95;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .cta-btn {
          padding: 16px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.05rem;
          transition: all 0.3s;
        }

        .cta-btn.primary {
          background: white;
          color: #c89585;
        }

        .cta-btn.secondary {
          background: transparent;
          color: white;
          border: 2px solid white;
        }

        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .disclaimer {
          font-size: 0.8rem;
          opacity: 0.8;
          font-style: italic;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .reasons-grid,
          .revenue-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .milestones-timeline,
          .team-credentials {
            grid-template-columns: repeat(2, 1fr);
          }

          .market-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .investor-hero h1 {
            font-size: 2.2rem;
          }

          .hero-stats {
            grid-template-columns: 1fr;
          }

          .reasons-grid,
          .financial-grid,
          .revenue-grid,
          .milestones-timeline,
          .team-credentials {
            grid-template-columns: 1fr;
          }

          .market-section {
            padding: 30px 20px;
          }

          .investor-cta {
            padding: 40px 24px;
          }

          .cta-buttons {
            flex-direction: column;
          }

          .cta-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
