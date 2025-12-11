import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import paymentService from "../services/paymentService";
import "./Pricing.css";

const Pricing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState(null);
  const [canPurchase, setCanPurchase] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    loadAccessInfo();
    loadSnapScript();
  }, [currentUser]);

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
      navigate("/login");
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

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>🎨 Unlock Premium Frames</h1>
        <p>Dapatkan akses ke 30 frames premium selama 30 hari</p>
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

      <div className="pricing-card">
        <div className="package-badge">✨ Paket Premium</div>
        <div className="price">
          <span className="currency">Rp</span>
          <span className="amount">10.000</span>
        </div>

        <div className="package-details">
          <h3>Apa yang Anda Dapat:</h3>
          <ul className="features-list">
            <li>
              <span className="icon">📦</span>
              <div>
                <strong>3 Paket Frame Premium</strong>
                <p>Total 30 frames berkualitas tinggi</p>
              </div>
            </li>
            <li>
              <span className="icon">⏱️</span>
              <div>
                <strong>Akses 30 Hari</strong>
                <p>Gunakan frames kapan saja selama 1 bulan</p>
              </div>
            </li>
            <li>
              <span className="icon">🎨</span>
              <div>
                <strong>Frame Eksklusif</strong>
                <p>Dipilih khusus oleh admin</p>
              </div>
            </li>
            <li>
              <span className="icon">💳</span>
              <div>
                <strong>Banyak Metode Pembayaran</strong>
                <p>GoPay, OVO, DANA, ShopeePay, VA Bank, QRIS, Credit Card</p>
              </div>
            </li>
          </ul>
        </div>

        <button
          className={`buy-button ${!canPurchase || loading ? "disabled" : ""}`}
          onClick={handleBuyPackage}
          disabled={!canPurchase || loading}
        >
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Memproses...
            </>
          ) : !canPurchase ? (
            "Anda Sudah Memiliki Akses Aktif"
          ) : (
            "💳 Beli Sekarang - Rp 10.000"
          )}
        </button>

        {!canPurchase && access && (
          <p className="info-text">
            Anda dapat membeli paket baru setelah akses saat ini berakhir pada{" "}
            {new Date(access.accessEnd).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
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
