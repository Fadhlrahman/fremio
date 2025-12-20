import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import paymentService from "../services/paymentService";
import unifiedFrameService from "../services/unifiedFrameService";
import "./Pricing.css";

const Pricing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState(null);
  const [canPurchase, setCanPurchase] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const tabs = [
    "Christmas Fremio Series",
    "Holiday Fremio Series",
    "Year-End Recap Fremio Series",
  ];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [premiumFramesByCategory, setPremiumFramesByCategory] = useState({});
  const [loadingPreviewFrames, setLoadingPreviewFrames] = useState(true);

  useEffect(() => {
    // Pricing page should be viewable without login (Midtrans verification / marketing)
    // Only purchase flow requires auth.
    if (currentUser) {
      loadAccessInfo();
    } else {
      setAccess(null);
      setCanPurchase(false);
      setCheckingAccess(false);
    }

    loadSnapScript();
    loadPreviewFrames();
  }, [currentUser]);

  const loadPreviewFrames = async () => {
    try {
      setLoadingPreviewFrames(true);
      const frames = await unifiedFrameService.getAllFrames();

      // Pricing preview is based on category only (not tied to paid/free).
      const allowed = new Set(tabs);
      const categoryFrames = (frames || []).filter((f) =>
        allowed.has(String(f.category || ""))
      );

      const grouped = categoryFrames.reduce((acc, frame) => {
        const category = String(frame.category || "Uncategorized");
        if (!acc[category]) acc[category] = [];
        acc[category].push(frame);
        return acc;
      }, {});

      // Sort within each category by displayOrder then createdAt
      Object.keys(grouped).forEach((category) => {
        grouped[category].sort(
          (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
        );
      });

      setPremiumFramesByCategory(grouped);
    } catch (error) {
      console.error("Load preview frames error:", error);
      setPremiumFramesByCategory({});
    } finally {
      setLoadingPreviewFrames(false);
    }
  };

  const loadAccessInfo = async () => {
    try {
      setCheckingAccess(true);

      // Check current access
      const accessResponse = await paymentService.getAccess();
      if (accessResponse.success && accessResponse.hasAccess) {
        setAccess(accessResponse.data);
      }

      // Check if can purchase
      const purchaseResponse = await paymentService.canPurchase();
      setCanPurchase(purchaseResponse.canPurchase);
    } catch (error) {
      console.error("Load access info error:", error);
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadSnapScript = async () => {
    try {
      await paymentService.loadSnapScript();
    } catch (error) {
      console.error("Load Snap script error:", error);
    }
  };

  const handleBuyPackage = async () => {
    if (!currentUser) {
      navigate("/login?redirect=/pricing");
      return;
    }

    if (!canPurchase) {
      alert("Anda masih memiliki akses aktif. Tidak bisa membeli paket baru.");
      return;
    }

    try {
      setLoading(true);

      // Create payment
      const response = await paymentService.createPayment({
        email: currentUser.email,
        name: currentUser.displayName || "Fremio User",
        phone: currentUser.phoneNumber || "",
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to create payment");
      }

      // Open Midtrans Snap
      paymentService.openSnapPayment(response.data.token, {
        onSuccess: (result) => {
          console.log("Payment success:", result);
          alert("Pembayaran berhasil! Akses frame Anda sudah aktif.");
          navigate("/frames");
        },
        onPending: (result) => {
          console.log("Payment pending:", result);
          alert("Pembayaran pending. Silakan selesaikan pembayaran Anda.");
          navigate("/dashboard");
        },
        onError: (result) => {
          console.error("Payment error:", result);
          alert("Pembayaran gagal. Silakan coba lagi.");
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Buy package error:", error);
      alert(error.message || "Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="pricing-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Memuat informasi...</p>
        </div>
      </div>
    );
  }

  const christmasFrames = premiumFramesByCategory["Christmas Fremio Series"] || [];
  const holidayFrames = premiumFramesByCategory["Holiday Fremio Series"] || [];
  const yearEndFrames = premiumFramesByCategory["Year-End Recap Fremio Series"] || [];
  const tabFrames = premiumFramesByCategory[activeTab] || [];

  return (
    <div className="pricing-container">
      <div className="pricing-hero">
        <div className="pricing-brand">fremio</div>
        <div className="pricing-tagline">
          <span className="brand-soft">fremio</span> tempat dunia mengekspresikan dirinya
        </div>
      </div>

      {access && (
        <div className="current-access">
          <div className="access-card">
            <div className="access-header">
              <span className="access-badge active">✅ Akses Aktif</span>
              <span className="days-remaining">
                {access.daysRemaining} hari tersisa
              </span>
            </div>
            <div className="access-info">
              <p>
                <strong>Total Frames:</strong> {access.totalFrames} frames
              </p>
              <p>
                <strong>Paket Aktif:</strong> {access.packageIds.length} paket
              </p>
              <p>
                <strong>Berakhir:</strong>{" "}
                {new Date(access.accessEnd).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pricing-offer-card">
        <div className="offer-title">Fremio Holiday + New Year Series</div>
        <div className="offer-price">Rp 10.000/bulan</div>

        <div className="offer-columns">
          <div className="offer-col">
            <div className="offer-col-title">December Series Frames:</div>
            <ul>
              <li>{yearEndFrames.length || 0} Year-End Recap frames</li>
              <li>{christmasFrames.length || 0} Christmas frames</li>
              <li>{holidayFrames.length || 0} Holiday frames</li>
            </ul>
          </div>
          <div className="offer-col">
            <div className="offer-col-title">January Series Frames (Coming Soon):</div>
            <ul>
              <li>Akses puluhan frames di awal tahun</li>
              <li>Frames segera hadir</li>
            </ul>
          </div>
        </div>

        <button
          className={`offer-cta ${(loading || !!access) ? "disabled" : ""}`}
          onClick={handleBuyPackage}
          disabled={!!access || loading}
        >
          {loading ? "Memproses..." : access ? "Akses Anda Aktif" : "Dapatkan Sekarang"}
        </button>

        {!currentUser && (
          <div className="offer-note">Login diperlukan untuk melakukan pembelian.</div>
        )}
        {currentUser && !canPurchase && access && (
          <div className="offer-note">
            Anda dapat membeli lagi setelah berakhir pada{" "}
            {new Date(access.accessEnd).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      <div className="pricing-preview">
        <div className="preview-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`preview-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="preview-panel">
          <div className="preview-quote">“Year-End Frames untuk rayakan tahun baru”</div>

          {loadingPreviewFrames ? (
            <div className="preview-loading">Memuat preview frames...</div>
          ) : tabFrames.length === 0 ? (
            <div className="preview-empty">Belum ada frames untuk kategori ini.</div>
          ) : (
            <div className="preview-grid">
              {tabFrames.slice(0, 10).map((frame, idx) => (
                <div key={frame.id || idx} className="preview-item">
                  <div className="preview-thumb">
                    <img
                      src={frame.thumbnailUrl || frame.imageUrl || frame.imagePath}
                      alt={frame.name || `Frame ${idx + 1}`}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                  <div className="preview-name">Frame {idx + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="payment-info">
        <h3>🔒 Pembayaran Aman</h3>
        <p>
          Transaksi Anda dilindungi oleh Midtrans, payment gateway terpercaya di
          Indonesia
        </p>
        <div className="payment-methods">
          <img
            src="/images/gopay.png"
            alt="GoPay"
            onError={(e) => (e.target.style.display = "none")}
          />
          <img
            src="/images/ovo.png"
            alt="OVO"
            onError={(e) => (e.target.style.display = "none")}
          />
          <img
            src="/images/dana.png"
            alt="DANA"
            onError={(e) => (e.target.style.display = "none")}
          />
          <img
            src="/images/shopeepay.png"
            alt="ShopeePay"
            onError={(e) => (e.target.style.display = "none")}
          />
        </div>
      </div>

      <div className="faq-section">
        <h3>❓ Pertanyaan Umum</h3>
        <div className="faq-item">
          <h4>Berapa lama akses berlaku?</h4>
          <p>Akses berlaku selama 30 hari sejak pembayaran berhasil.</p>
        </div>
        <div className="faq-item">
          <h4>Bisakah saya beli paket lagi sebelum 30 hari?</h4>
          <p>
            Tidak. Anda hanya bisa membeli paket baru setelah masa aktif
            berakhir.
          </p>
        </div>
        <div className="faq-item">
          <h4>Apa yang terjadi setelah 30 hari?</h4>
          <p>
            Frames akan terkunci kembali. Anda perlu membeli paket baru untuk
            mendapat akses lagi.
          </p>
        </div>
        <div className="faq-item">
          <h4>Bagaimana cara pembayaran?</h4>
          <p>
            Klik "Beli Sekarang", pilih metode pembayaran favorit Anda, dan
            ikuti instruksi pembayaran.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
