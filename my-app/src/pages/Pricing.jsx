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
  const [pendingPayment, setPendingPayment] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Premium frames categories shown on Pricing page
  // Must match the exact category strings used when uploading frames in Admin.
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

      // Reset pending state
      setPendingPayment(null);

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

      // Check if there is a pending payment to resume
      try {
        const pendingResponse = await paymentService.getPending();
        if (pendingResponse?.success && pendingResponse?.hasPending && pendingResponse?.data) {
          setPendingPayment(pendingResponse.data);
          // Prevent new checkout while pending exists
          setCanPurchase(false);
        }
      } catch (pendingError) {
        console.log("⚠️ Could not load pending payment:", pendingError.message);
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

  const syncAccess = async (orderId = null, retries = 3) => {
    try {
      if (orderId) {
        await paymentService.checkStatus(orderId);
      } else {
        await paymentService.reconcileLatest?.();
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const accessResponse = await paymentService.getAccess();
      if (accessResponse?.success && accessResponse?.hasAccess) {
        alert("✅ Access berhasil! Sekarang Anda bisa menggunakan semua frame premium.");
        navigate("/frames");
        return true;
      }

      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return syncAccess(orderId, retries - 1);
      }

      return false;
    } catch (e) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return syncAccess(orderId, retries - 1);
      }
      return false;
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

    if (!termsAccepted) {
      alert(
        "Sebelum melanjutkan pembayaran, Anda wajib menyetujui Syarat & Ketentuan (termasuk kebijakan No Refund)."
      );
      return;
    }

    try {
      setLoading(true);
      
      // Auto-check for pending payment and resume if exists
      if (pendingPayment && (pendingPayment.snapToken || pendingPayment.redirectUrl)) {
        console.log("📋 Found pending payment, auto-resuming...");
        await paymentService.loadSnapScript();

        if (pendingPayment.snapToken) {
          paymentService.openSnapPayment(pendingPayment.snapToken, {
            onSuccess: () => syncAccess(pendingPayment.orderId).finally(() => setLoading(false)),
            onPending: () => syncAccess(pendingPayment.orderId).finally(() => setLoading(false)),
            onError: async () => {
              // Auto-cancel and create new on error
              console.log("⚠️ Resume failed, auto-canceling and creating new payment...");
              try {
                await paymentService.cancelLatestPending();
                setPendingPayment(null);
                setCanPurchase(true);
                // Retry create payment (recursive call)
                setLoading(false);
                await handleBuyPackage();
              } catch (cancelError) {
                console.error("Cancel pending error:", cancelError);
                alert("Gagal melanjutkan pembayaran. Silakan refresh halaman dan coba lagi.");
                setLoading(false);
              }
            },
          });
          return;
        }

        if (pendingPayment.redirectUrl) {
          window.open(pendingPayment.redirectUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => {
            syncAccess(pendingPayment.orderId);
          }, 1500);
          setLoading(false);
          return;
        }
      }

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
          syncAccess(orderId).then((ok) => {
            if (!ok) {
              setLoading(false);
            }
          });
        },
        onPending: (result) => {
          console.log("Payment pending:", result);
          syncAccess(orderId).finally(() => setLoading(false));
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
        `Gagal membuat pembayaran:\n${errorMsg}\n\nSilakan refresh halaman dan coba lagi.`
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

  const christmasFrames = premiumFramesByCategory["Christmas Fremio Series"] || [];
  const holidayFrames = premiumFramesByCategory["Holiday Fremio Series"] || [];
  const yearEndFrames = premiumFramesByCategory["Year-End Recap Fremio Series"] || [];
  const tabFrames = premiumFramesByCategory[activeTab] || [];

  const pendingCanResume =
    !!pendingPayment &&
    !pendingPayment.unavailable &&
    !!(pendingPayment.snapToken || pendingPayment.redirectUrl);

  const pendingCanManage = !!pendingPayment && !pendingPayment.unavailable;

  const previewQuote =
    activeTab === "Christmas Fremio Series"
      ? "“Christmas Frames untuk rayakan Natal”"
      : activeTab === "Holiday Fremio Series"
      ? "“Holiday Frames untuk temani liburan”"
      : "“Year-End Frames untuk rayakan tahun baru”";

  return (
    <div className="pricing-container">
      <div className="pricing-hero">
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
        {access ? (
          <>
            <div className="offer-title" style={{ color: "#10b981" }}>
              ✓ Anda Sudah Berlangganan
            </div>
            <div className="offer-subtitle" style={{ 
              fontSize: "16px", 
              color: "#666", 
              marginTop: "10px",
              textAlign: "center" 
            }}>
              Nikmati akses premium Anda hingga{" "}
              {new Date(access.accessEnd).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            <div className="offer-columns" style={{ marginTop: "30px" }}>
              <div className="offer-col">
                <div className="offer-col-title">Akses Anda Saat Ini:</div>
                <ul>
                  <li>✓ {access.totalFrames} Premium Frames</li>
                  <li>✓ {access.packageIds.length} Paket Aktif</li>
                  <li>✓ Semua kategori terbuka</li>
                  <li>✓ Update frame baru gratis</li>
                </ul>
              </div>
              <div className="offer-col">
                <div className="offer-col-title">Yang Bisa Anda Lakukan:</div>
                <ul>
                  <li>Gunakan semua frame premium</li>
                  <li>Download hasil tanpa watermark</li>
                  <li>Akses frame baru yang akan datang</li>
                  <li>Perpanjang setelah masa aktif berakhir</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="offer-title">fremio Monthly Series</div>
            <div className="offer-price">
              <span className="offer-price-old">Rp 50.000/bulan</span>
              <span className="offer-price-new">Rp 10.000/bulan</span>
            </div>

            <div className="offer-columns">
              <div className="offer-col">
                <div className="offer-col-title">Akses Semua Frames:</div>
                <ul>
                  <li>{christmasFrames.length || 0} Christmas Fremio Series frames</li>
                  <li>{holidayFrames.length || 0} Holiday Fremio Series frames</li>
                  <li>{yearEndFrames.length || 0} Year-End Recap Fremio Series frames</li>
                  <li>
                    Total:{" "}
                    {christmasFrames.length + holidayFrames.length + yearEndFrames.length}{" "}
                    frames
                  </li>
                </ul>
              </div>
              <div className="offer-col">
                <div className="offer-col-title">Benefit Premium:</div>
                <ul>
                  <li>Akses unlimited ke semua frame</li>
                  <li>Update frame baru setiap bulan</li>
                  <li>Beli di bulan Desember dapat gratis January Fremio Series (coming soon)</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {!access && (
          <>
            <div className="pricing-terms">
              <div className="pricing-terms-title">Syarat & Ketentuan Pembelian</div>
              <ul className="pricing-terms-list">
                <li>
                  Dengan menekan tombol pembayaran, Anda menyetujui Syarat & Ketentuan ini.
                </li>
                <li>
                  Pembelian layanan digital/langganan bersifat final.
                </li>
                <li>
                  <strong>No Refund:</strong> setelah pembayaran berhasil, dana <strong>tidak dapat dikembalikan</strong> dengan alasan apa pun.
                </li>
                <li>
                  Jika Anda mengalami kendala pembayaran, hubungi kami di{" "}
                  <a className="pricing-terms-link" href="mailto:fremioid@gmail.com">
                    fremioid@gmail.com
                  </a>
                  .
                </li>
              </ul>

              <label className="pricing-terms-agree">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  Saya telah membaca dan setuju dengan Syarat & Ketentuan (termasuk kebijakan No Refund).
                </span>
              </label>
            </div>
          </>
        )}

        <button
          className={`offer-cta ${
            access 
              ? "active-subscription" 
              : loading || (currentUser && !access && !termsAccepted) 
              ? "disabled" 
              : ""
          }`}
          onClick={access ? () => navigate("/frames") : handleBuyPackage}
          disabled={!access && (loading || (currentUser && !access && !termsAccepted))}
        >
          {loading
            ? "Memproses..."
            : access
            ? "Gunakan Frame Premium Sekarang →"
            : "Dapatkan Sekarang"}
        </button>

        {!currentUser && (
          <div className="offer-note">
            Login diperlukan untuk melakukan pembelian.
          </div>
        )}

        {currentUser && !access && pendingPayment && (
          <div className="offer-note">
            Anda memiliki transaksi yang sedang pending. Klik "Dapatkan Sekarang" untuk melanjutkan pembayaran.
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
            {previewQuote}
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
