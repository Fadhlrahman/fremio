import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import paymentService from "../services/paymentService";
import unifiedFrameService from "../services/unifiedFrameService";
import "./Pricing.css";

const Pricing = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState(null);
  const [canPurchase, setCanPurchase] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const tabs = ["Fremio Series", "Music", "Sport Series"];
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
      try {
        const accessResponse = await paymentService.getAccess();
        if (
          accessResponse &&
          accessResponse.success &&
          accessResponse.hasAccess
        ) {
          setAccess(accessResponse.data);
        } else {
          setAccess(null);
        }
      } catch (accessError) {
        console.log("⚠️ Could not load access info:", accessError.message);
        setAccess(null);
      }

      // Check if can purchase
      try {
        const purchaseResponse = await paymentService.canPurchase();
        if (purchaseResponse && purchaseResponse.success) {
          setCanPurchase(purchaseResponse.canPurchase);
        } else {
          setCanPurchase(true); // Default: allow purchase if check fails
        }
      } catch (purchaseError) {
        console.log(
          "⚠️ Could not check purchase eligibility:",
          purchaseError.message
        );
        setCanPurchase(true); // Default: allow purchase if check fails
      }
    } catch (error) {
      console.error("Load access info error:", error);
      // Set defaults on error
      setAccess(null);
      setCanPurchase(true);
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
    console.log("🛒 Buy package clicked");
    console.log("👤 Current user:", currentUser);
    console.log("💳 Can purchase:", canPurchase);
    console.log("🔑 Has access:", access);

    if (!currentUser) {
      console.warn("⚠️ User not logged in, redirecting to register");

      // Show friendly message
      const userChoice = confirm(
        "Anda perlu login untuk melakukan pembelian.\n\n" +
          "Klik OK untuk Register (akun baru)\n" +
          "Klik Cancel untuk Login (sudah punya akun)"
      );

      if (userChoice) {
        // User wants to register
        navigate("/register?redirect=/pricing");
      } else {
        // User wants to login
        navigate("/login?redirect=/pricing");
      }
      return;
    }

    if (!canPurchase && access) {
      alert("Anda masih memiliki akses aktif. Tidak bisa membeli paket baru.");
      return;
    }

    try {
      setLoading(true);
      console.log("💰 Creating payment for:", currentUser.email);
      console.log("📋 Request data:", {
        email: currentUser.email,
        name: currentUser.displayName || "Fremio User",
        phone: currentUser.phoneNumber || "",
      });

      // Create payment
      const response = await paymentService.createPayment({
        email: currentUser.email,
        name: currentUser.displayName || "Fremio User",
        phone: currentUser.phoneNumber || "",
      });

      console.log("✅ Payment response:", response);

      // Check if response has required fields
      if (!response) {
        console.error("❌ No response received");
        throw new Error("Failed to create payment: No response");
      }

      // Response is already unwrapped by paymentService
      // Structure: {success, data: {orderId, token, redirectUrl}} OR direct {orderId, token, redirectUrl}
      const paymentData = response.data || response; // Handle both formats

      if (!paymentData || !paymentData.token || !paymentData.orderId) {
        console.error("❌ Payment token or orderId missing:", response);
        throw new Error("Payment token not received from server");
      }

      console.log(
        "🎫 Payment token received:",
        paymentData.token.substring(0, 20) + "..."
      );
      console.log("📦 Order ID:", paymentData.orderId);

      const orderId = paymentData.orderId;

      const syncAccess = async (retries = 3) => {
        console.log(`🔄 Syncing access... (retries left: ${retries})`);
        try {
          if (orderId) {
            console.log("📞 Checking payment status for order:", orderId);
            const statusResponse = await paymentService.checkStatus(orderId);
            console.log("📊 Status response:", statusResponse);
          } else {
            console.log("⚠️ No orderId, reconciling latest...");
            await paymentService.reconcileLatest?.();
          }

          // Wait a bit for backend to process
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const accessResponse = await paymentService.getAccess();
          console.log("🔑 Access response:", accessResponse);

          if (
            accessResponse &&
            accessResponse.success &&
            accessResponse.hasAccess
          ) {
            console.log("✅ Access granted! Redirecting to frames...");
            alert(
              "✅ Access berhasil! Sekarang Anda bisa menggunakan semua frame premium."
            );
            navigate("/frames");
            return true;
          }

          // Retry if access not yet granted
          if (retries > 0) {
            console.log("⏳ Access not yet granted, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return syncAccess(retries - 1);
          }

          console.warn("⚠️ Access not granted after retries");
          alert(
            "⚠️ Pembayaran berhasil tapi access belum aktif. Silakan refresh halaman atau hubungi admin."
          );
          return false;
        } catch (e) {
          console.error("❌ Sync access error:", e);
          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return syncAccess(retries - 1);
          }
          return false;
        }
      };

      // Open Midtrans Snap
      console.log("🚀 Opening Midtrans Snap popup...");

      if (!window.snap) {
        console.error("❌ window.snap not available! Snap script not loaded.");
        alert(
          "Payment system not ready. Please refresh the page and try again."
        );
        setLoading(false);
        return;
      }

      paymentService.openSnapPayment(paymentData.token, {
        onSuccess: (result) => {
          console.log("Payment success:", result);
          alert(
            "Pembayaran berhasil. Sedang memverifikasi akses... Jika belum terbuka, tunggu beberapa detik lalu coba lagi."
          );
          syncAccess().then((ok) => {
            if (!ok) {
              setLoading(false);
            }
          });
        },
        onPending: (result) => {
          console.log("Payment pending:", result);
          alert(
            "Pembayaran pending. Silakan selesaikan pembayaran. Kami akan cek statusnya secara otomatis."
          );
          syncAccess().finally(() => setLoading(false));
        },
        onError: (result) => {
          console.error("Payment error:", result);
          alert("Pembayaran gagal. Silakan coba lagi.");
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("❌ Buy package error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        data: error.data,
        stack: error.stack,
      });

      const errorMsg =
        error.message ||
        error.data?.message ||
        "Terjadi kesalahan. Silakan coba lagi.";
      alert(
        `Gagal membuat pembayaran:\n${errorMsg}\n\nSilakan coba login ulang jika masalah berlanjut.`
      );
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

  const fremioSeriesFrames = premiumFramesByCategory["Fremio Series"] || [];
  const musicFrames = premiumFramesByCategory["Music"] || [];
  const sportFrames = premiumFramesByCategory["Sport Series"] || [];
  const tabFrames = premiumFramesByCategory[activeTab] || [];

  return (
    <div className="pricing-container">
      <div className="pricing-hero">
        <div className="pricing-brand">fremio</div>
        <div className="pricing-tagline">
          <span className="brand-soft">fremio</span> tempat dunia
          mengekspresikan dirinya
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
        <div className="offer-title">Fremio Premium Frame Collection</div>
        <div className="offer-price">Rp 10.000/bulan</div>

        <div className="offer-columns">
          <div className="offer-col">
            <div className="offer-col-title">Akses Semua Frames:</div>
            <ul>
              <li>{fremioSeriesFrames.length || 0} Fremio Series frames</li>
              <li>{musicFrames.length || 0} Music-inspired frames</li>
              <li>{sportFrames.length || 0} Sport frames</li>
              <li>
                Total:{" "}
                {fremioSeriesFrames.length +
                  musicFrames.length +
                  sportFrames.length}{" "}
                frames
              </li>
            </ul>
          </div>
          <div className="offer-col">
            <div className="offer-col-title">Benefit Premium:</div>
            <ul>
              <li>Akses unlimited ke semua frame</li>
              <li>Download tanpa watermark</li>
              <li>Update frame baru setiap bulan</li>
              <li>Support 24/7</li>
            </ul>
          </div>
        </div>

        <button
          className={`offer-cta ${loading || !!access ? "disabled" : ""}`}
          onClick={handleBuyPackage}
          disabled={!!access || loading}
        >
          {loading
            ? "Memproses..."
            : access
            ? "Akses Anda Aktif"
            : "Dapatkan Sekarang"}
        </button>

        {!currentUser && (
          <div className="offer-note">
            Login diperlukan untuk melakukan pembelian.
          </div>
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
          <div className="preview-quote">
            “Year-End Frames untuk rayakan tahun baru”
          </div>

          {loadingPreviewFrames ? (
            <div className="preview-loading">Memuat preview frames...</div>
          ) : tabFrames.length === 0 ? (
            <div className="preview-empty">
              Belum ada frames untuk kategori ini.
            </div>
          ) : (
            <div className="preview-grid">
              {tabFrames.slice(0, 10).map((frame, idx) => (
                <div key={frame.id || idx} className="preview-item">
                  <div className="preview-thumb">
                    <img
                      src={
                        frame.thumbnailUrl || frame.imageUrl || frame.imagePath
                      }
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
        <div
          className="payment-methods"
          style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "15px",
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            💳 Kartu Kredit/Debit
          </span>
          <span
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            🏪 Bank Transfer
          </span>
          <span
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            📱 E-Wallet
          </span>
          <span
            style={{
              padding: "8px 16px",
              background: "#f0f0f0",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            🏬 Convenience Store
          </span>
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
