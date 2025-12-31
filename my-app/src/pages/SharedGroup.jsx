import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getSharedGroup } from "../services/groupService.js";
import { useHeaderBranding } from "../contexts/HeaderBrandingContext.jsx";

function SharedFrameCard({ frame, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const description = frame?.description || "";
  const maxLength = 50;
  const shouldTruncate = description.length > maxLength;
  const displayDescription = expanded ? description : description.slice(0, maxLength);

  const handleActivate = () => {
    if (typeof onSelect === "function") onSelect();
  };

  return (
    <div
      className="frame-card"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "8px",
        backgroundColor: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        border: "2px solid transparent",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
      }}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onTouchEnd={(e) => {
        // Ensure taps trigger navigation on mobile.
        e.preventDefault();
        handleActivate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
        e.currentTarget.style.borderColor = "#e0a899";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f9fafb",
          aspectRatio: "9/16",
          width: "100%",
          padding: "12px",
          boxSizing: "border-box",
        }}
      >
        {frame?.thumbnail ? (
          <img
            src={frame.thumbnail}
            alt={frame?.title || "Frame"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "4px",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
            }}
          >
            <span style={{ fontSize: "12px" }}>Gambar tidak tersedia</span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: "8px 8px 4px 8px",
          textAlign: "center",
          fontSize: frame?.title && String(frame.title).length > 25 ? "10px" : "12px",
          fontWeight: 600,
          color: "#1e293b",
          lineHeight: "1.3",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          hyphens: "auto",
          minHeight: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {frame?.title || "Frame"}
      </div>

      {description ? (
        <div
          style={{
            padding: "0 8px 8px 8px",
            textAlign: "center",
            fontSize: "10px",
            color: "#64748b",
            lineHeight: "1.4",
          }}
        >
          <span>
            {displayDescription}
            {shouldTruncate && !expanded && "..."}
          </span>
          {shouldTruncate ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{
                display: "inline",
                marginLeft: "4px",
                padding: 0,
                border: "none",
                background: "none",
                color: "#c89585",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {expanded ? "Sembunyikan" : "Selengkapnya"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function SharedGroup() {
  const { shareId } = useParams();
  const { setBranding, clearBranding } = useHeaderBranding();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);

  const frames = useMemo(() => {
    return Array.isArray(group?.frames) ? group.frames : [];
  }, [group?.frames]);

  const preferences = useMemo(() => {
    const prefsRaw = group?.preferences;
    if (prefsRaw && typeof prefsRaw === "object") return prefsRaw;
    if (typeof prefsRaw === "string") {
      try {
        return JSON.parse(prefsRaw);
      } catch {
        return null;
      }
    }
    return null;
  }, [group?.preferences]);

  const headerColor = preferences?.headerColor || "#ffffff";
  const backgroundColor = preferences?.backgroundColor || "#ffffff";
  const logoDataUrl = preferences?.logoDataUrl || null;
  const title1Text = preferences?.title1Text || "";
  const title2Text = preferences?.title2Text || "";
  const text = preferences?.text || "";

  // IMPORTANT: Keep hooks unconditional to avoid React hook order crashes.
  useEffect(() => {
    setBranding({
      // Header logo should remain Fremio; branding only controls color here.
      logoSrc: null,
      headerColor: headerColor || null,
    });

    return () => {
      clearBranding();
    };
  }, [clearBranding, headerColor, logoDataUrl, setBranding]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const data = await getSharedGroup(shareId);
        if (cancelled) return;

        const framesRaw = data?.frames;
        const frames = Array.isArray(framesRaw)
          ? framesRaw
          : typeof framesRaw === "string"
          ? JSON.parse(framesRaw)
          : [];

        setGroup({
          title: data?.title || "Group Frames",
          frames,
          preferences: data?.preferences || null,
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "Group tidak ditemukan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (shareId) run();

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return (
      <section
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)",
          paddingTop: "48px",
          paddingBottom: "48px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px" }}>
          <h2
            style={{
              marginBottom: "24px",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
            }}
          >
            Memuat group...
          </h2>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        style={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)",
          paddingTop: "48px",
          paddingBottom: "48px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px" }}>
          <h2
            style={{
              marginBottom: "12px",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
            }}
          >
            Group Tidak Ditemukan
          </h2>
          <p style={{ textAlign: "center", color: "#64748b" }}>{error}</p>
        </div>
      </section>
    );
  }

  const pageTitle = title1Text || group?.title || "Group Frames";

  return (
    <>
      <style>{`
        .frames-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .frames-grid .frame-card {
          width: 100%;
          max-width: 220px;
        }
        @media (min-width: 768px) {
          .frames-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
          }
          .frames-grid .frame-card {
            width: 100%;
            max-width: 220px;
          }
        }
      `}</style>
      <section
        style={{
          minHeight: "100vh",
          background: backgroundColor || "#ffffff",
          paddingTop: "28px",
          paddingBottom: "48px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px" }}>
          {logoDataUrl ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                margin: "6px 0 14px 0",
              }}
            >
              <img
                src={logoDataUrl}
                alt="Logo"
                style={{
                  maxHeight: "52px",
                  maxWidth: "220px",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : null}
          <h2
            style={{
              margin: "0 0 10px 0",
              textAlign: "center",
              fontSize: "22px",
              fontWeight: 900,
              color: "#1e293b",
            }}
          >
            {pageTitle}
          </h2>

          <div className="frames-grid">
            {frames.map((frameItem, idx) => {
              const frameShareId = frameItem?.shareId || frameItem?.share_id;

              return (
                <SharedFrameCard
                  key={frameShareId || idx}
                  frame={{
                    title: frameItem?.title || `Frame ${idx + 1}`,
                    thumbnail: frameItem?.thumbnail || null,
                    description: frameItem?.description || "",
                  }}
                  onSelect={() => {
                    if (!frameShareId) return;
                    // Go straight to TakeMoment (no intermediate share page)
                    // Use hard navigation for reliability across in-app browsers.
                    const targetPath = `/take-moment?share=${encodeURIComponent(frameShareId)}`;
                    const targetUrl = new URL(targetPath, window.location.origin).toString();
                    window.location.assign(targetUrl);
                  }}
                />
              );
            })}
          </div>

          {title2Text ? (
            <div
              style={{
                marginTop: "18px",
                textAlign: "left",
                fontSize: "22px",
                fontWeight: 900,
                color: "#1e293b",
              }}
            >
              {title2Text}
            </div>
          ) : null}

          {text ? (
            <div
              style={{
                marginTop: "8px",
                textAlign: "left",
                fontSize: "12px",
                color: "#475569",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {text}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
