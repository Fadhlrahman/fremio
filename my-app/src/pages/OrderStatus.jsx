import { useState } from "react";

export default function OrderStatus() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mock order data for demo
  const mockOrders = {
    FRM001: {
      id: "FRM001",
      date: "2025-11-20",
      status: "completed",
      items: [
        { name: "Birthday Frame Set", quantity: 1, price: 150000 },
        { name: "Custom Photo Print", quantity: 3, price: 75000 },
      ],
      total: 375000,
      shipping: {
        method: "JNE Regular",
        tracking: "JNE123456789",
        address: "Jl. Sudirman No. 123, Jakarta",
      },
    },
    FRM002: {
      id: "FRM002",
      date: "2025-11-23",
      status: "processing",
      items: [{ name: "Wedding Frame Premium", quantity: 1, price: 250000 }],
      total: 250000,
      shipping: {
        method: "Gosend Same Day",
        tracking: "-",
        address: "Jl. Gatot Subroto No. 45, Bandung",
      },
    },
    FRM003: {
      id: "FRM003",
      date: "2025-11-24",
      status: "shipped",
      items: [{ name: "Family Portrait Frame", quantity: 2, price: 180000 }],
      total: 360000,
      shipping: {
        method: "SiCepat Halu",
        tracking: "SC987654321",
        address: "Jl. Asia Afrika No. 78, Surabaya",
      },
    },
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const order = mockOrders[orderId.toUpperCase()];

      if (!order) {
        setError("Order tidak ditemukan. Pastikan Order ID benar.");
        setSearchResult(null);
      } else {
        setSearchResult(order);
      }

      setLoading(false);
    }, 1000);
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: "Menunggu Pembayaran", color: "#fbbf24", icon: "⏳" },
      processing: { label: "Diproses", color: "#60a5fa", icon: "⚙️" },
      shipped: { label: "Dikirim", color: "#a78bfa", icon: "🚚" },
      completed: { label: "Selesai", color: "#34d399", icon: "✅" },
      cancelled: { label: "Dibatalkan", color: "#f87171", icon: "❌" },
    };
    return statusMap[status] || statusMap.pending;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="anchor order-status-wrap">
      <div className="container">
        {/* Header */}
        <div className="os-header">
          <h1>📦 Order Status</h1>
          <p>Lacak status pesanan Anda</p>
        </div>

        {/* Search Form */}
        <div className="search-section">
          <div className="search-card">
            <h3>🔍 Cek Status Order</h3>
            <p>Masukkan Order ID dan email untuk melacak pesanan</p>

            <form onSubmit={handleSearch}>
              <div className="form-row">
                <div className="form-group">
                  <label>Order ID *</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Contoh: FRM001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="search-btn" disabled={loading}>
                {loading ? "Mencari..." : "🔍 Lacak Pesanan"}
              </button>
            </form>

            {error && <div className="error-box">⚠️ {error}</div>}

            {/* Demo IDs */}
            <div className="demo-hint">
              <p>
                💡 <strong>Demo:</strong> Coba Order ID: <code>FRM001</code>,{" "}
                <code>FRM002</code>, atau <code>FRM003</code>
              </p>
            </div>
          </div>
        </div>

        {/* Order Result */}
        {searchResult && (
          <div className="result-section">
            {/* Order Info */}
            <div className="order-card">
              <div className="order-header">
                <div>
                  <h3>Order #{searchResult.id}</h3>
                  <p>
                    Tanggal:{" "}
                    {new Date(searchResult.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div
                  className="status-badge"
                  style={{
                    background: getStatusInfo(searchResult.status).color,
                  }}
                >
                  {getStatusInfo(searchResult.status).icon}{" "}
                  {getStatusInfo(searchResult.status).label}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="order-timeline">
                <h4>📊 Status Timeline</h4>
                <div className="timeline">
                  <div
                    className={`timeline-item ${
                      [
                        "pending",
                        "processing",
                        "shipped",
                        "completed",
                      ].includes(searchResult.status)
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Order Dibuat</strong>
                      <p>{searchResult.date}</p>
                    </div>
                  </div>

                  <div
                    className={`timeline-item ${
                      ["processing", "shipped", "completed"].includes(
                        searchResult.status
                      )
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Pembayaran Diterima</strong>
                      <p>
                        {searchResult.status !== "pending"
                          ? "Lunas"
                          : "Menunggu"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`timeline-item ${
                      ["shipped", "completed"].includes(searchResult.status)
                        ? "active"
                        : ""
                    }`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Pesanan Dikirim</strong>
                      <p>
                        {searchResult.status === "shipped" ||
                        searchResult.status === "completed"
                          ? "Dalam perjalanan"
                          : "Menunggu"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`timeline-item ${
                      searchResult.status === "completed" ? "active" : ""
                    }`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <strong>Pesanan Diterima</strong>
                      <p>
                        {searchResult.status === "completed"
                          ? "Selesai"
                          : "Menunggu"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="order-items">
                <h4>🛒 Items</h4>
                {searchResult.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="item-info">
                      <strong>{item.name}</strong>
                      <p>Qty: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
                <div className="total-row">
                  <strong>Total</strong>
                  <strong>{formatCurrency(searchResult.total)}</strong>
                </div>
              </div>

              {/* Shipping */}
              <div className="shipping-info">
                <h4>🚚 Pengiriman</h4>
                <div className="shipping-grid">
                  <div>
                    <p className="label">Metode</p>
                    <p className="value">{searchResult.shipping.method}</p>
                  </div>
                  <div>
                    <p className="label">Tracking Number</p>
                    <p className="value">{searchResult.shipping.tracking}</p>
                  </div>
                  <div>
                    <p className="label">Alamat</p>
                    <p className="value">{searchResult.shipping.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="help-card">
              <h4>💬 Butuh Bantuan?</h4>
              <p>Jika ada pertanyaan tentang pesanan Anda:</p>
              <div className="help-buttons">
                <a href="/call-center" className="help-btn">
                  📞 Hubungi Support
                </a>
                <a href="mailto:fremioid@gmail.com" className="help-btn">
                  📧 Email Kami
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .order-status-wrap {
          min-height: calc(100vh - 200px);
          padding: 40px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .os-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .os-header h1 {
          font-size: 2.5rem;
          margin-bottom: 12px;
          color: #111;
        }

        .os-header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        .search-section {
          max-width: 700px;
          margin: 0 auto 50px;
        }

        .search-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .search-card h3 {
          font-size: 1.5rem;
          margin-bottom: 8px;
          color: #111;
        }

        .search-card > p {
          color: #64748b;
          margin-bottom: 30px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #334155;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #e0b7a9;
          box-shadow: 0 0 0 3px rgba(224, 183, 169, 0.1);
        }

        .search-btn {
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

        .search-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(200, 149, 133, 0.3);
        }

        .search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          margin-top: 20px;
          padding: 16px;
          background: #fee;
          border: 2px solid #fcc;
          border-radius: 8px;
          color: #c33;
        }

        .demo-hint {
          margin-top: 20px;
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
        }

        .demo-hint p {
          margin: 0;
          font-size: 0.9rem;
          color: #0369a1;
        }

        .demo-hint code {
          padding: 2px 8px;
          background: white;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          font-family: monospace;
          margin: 0 4px;
        }

        .result-section {
          max-width: 900px;
          margin: 0 auto;
        }

        .order-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          padding-bottom: 24px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 30px;
        }

        .order-header h3 {
          font-size: 1.8rem;
          margin-bottom: 6px;
          color: #111;
        }

        .order-header p {
          color: #64748b;
          margin: 0;
        }

        .status-badge {
          padding: 10px 20px;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .order-timeline {
          margin-bottom: 30px;
        }

        .order-timeline h4 {
          font-size: 1.2rem;
          margin-bottom: 20px;
          color: #111;
        }

        .timeline {
          position: relative;
        }

        .timeline-item {
          display: flex;
          gap: 16px;
          position: relative;
          padding-bottom: 30px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-item:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 12px;
          top: 30px;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
        }

        .timeline-item.active:not(:last-child)::before {
          background: #e0b7a9;
        }

        .timeline-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e2e8f0;
          flex-shrink: 0;
          border: 4px solid white;
          box-shadow: 0 0 0 2px #e2e8f0;
        }

        .timeline-item.active .timeline-dot {
          background: #e0b7a9;
          box-shadow: 0 0 0 2px #e0b7a9;
        }

        .timeline-content strong {
          display: block;
          margin-bottom: 4px;
          color: #111;
        }

        .timeline-content p {
          margin: 0;
          font-size: 0.9rem;
          color: #64748b;
        }

        .order-items {
          margin-bottom: 30px;
        }

        .order-items h4 {
          font-size: 1.2rem;
          margin-bottom: 16px;
          color: #111;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .item-info strong {
          display: block;
          margin-bottom: 4px;
          color: #111;
        }

        .item-info p {
          margin: 0;
          font-size: 0.9rem;
          color: #64748b;
        }

        .item-price {
          font-weight: 600;
          color: #111;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 16px;
          background: #e0b7a9;
          color: white;
          border-radius: 8px;
          font-size: 1.1rem;
          margin-top: 10px;
        }

        .shipping-info h4 {
          font-size: 1.2rem;
          margin-bottom: 16px;
          color: #111;
        }

        .shipping-grid {
          display: grid;
          gap: 20px;
        }

        .shipping-grid .label {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 4px;
        }

        .shipping-grid .value {
          font-weight: 600;
          color: #111;
          margin: 0;
        }

        .help-card {
          background: linear-gradient(135deg, #e0b7a9 0%, #c89585 100%);
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          color: white;
        }

        .help-card h4 {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }

        .help-card > p {
          margin-bottom: 20px;
          opacity: 0.95;
        }

        .help-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .help-btn {
          padding: 12px 24px;
          background: white;
          color: #c89585;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .help-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 768px) {
          .os-header h1 {
            font-size: 2rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .search-card,
          .order-card {
            padding: 24px;
          }

          .order-header {
            flex-direction: column;
            gap: 16px;
          }

          .help-buttons {
            flex-direction: column;
          }

          .help-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
