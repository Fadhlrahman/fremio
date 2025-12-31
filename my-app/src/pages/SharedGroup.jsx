import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSharedGroup } from "../services/groupService.js";

export default function SharedGroup() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);

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

  const frames = Array.isArray(group?.frames) ? group.frames : [];

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
          background: "linear-gradient(to bottom, #fdf7f4, white, #f7f1ed)",
          paddingTop: "48px",
          paddingBottom: "48px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 16px" }}>
          <h2
            style={{
              marginBottom: "28px",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1e293b",
            }}
          >
            {group?.title || "Group Frames"}
          </h2>

          <div className="frames-grid">
            {frames.map((frame, idx) => {
              const description = frame?.description || "";
              const maxLength = 50;
              const shouldTruncate = description.length > maxLength;
              const displayDescription = shouldTruncate
                ? description.slice(0, maxLength)
                : description;

              return (
                <div
                  key={frame?.shareId || idx}
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
                    transition:
                      "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                    position: "relative",
                  }}
                  onClick={() => navigate(`/s/${frame.shareId}`)}
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
                      fontSize:
                        frame?.title && String(frame.title).length > 25 ? "10px" : "12px",
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
                    {frame?.title || `Frame ${idx + 1}`}
                  </div>

                  {description && (
                    <div
                      style={{
                        padding: "0 8px 8px 8px",
                        textAlign: "center",
                        fontSize: "10px",
                        color: "#64748b",
                        lineHeight: "1.4",
                      }}
                    >
                      {displayDescription}
                      {shouldTruncate ? "..." : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
