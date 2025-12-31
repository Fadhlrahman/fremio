import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { VPS_API_URL } from "../../config/backend";

const MAX_PEOPLE = 4;

const deriveWsUrl = () => {
  const api = String(VPS_API_URL || "").trim();

  // If API is relative, connect same-origin.
  if (api.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws/take-moment`;
  }

  // If API is absolute, replace scheme and strip trailing /api
  let base = api;
  if (base.endsWith("/api")) base = base.slice(0, -4);
  base = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  return `${base}/ws/take-moment`;
};

const safeJsonSend = (ws, msg) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
};

const createPeerConnection = ({ onIceCandidate, onTrack }) => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate);
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams || [];
    if (stream) onTrack(stream);
  };

  return pc;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function TakeMomentFriendsRoom({
  roomId,
  onRoomCreated,
  onMasterCaptured,
  onSessionEnded,
}) {
  const stageRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const clientIdRef = useRef(null);
  const roleRef = useRef(null);
  const pcsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()); // peerId -> MediaStream

  const [clientId, setClientId] = useState(null);
  const [role, setRole] = useState(null); // 'master' | 'participant'
  const isMaster = role === "master";

  // Keep refs in sync so callbacks can be stable
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // Use state so video tiles re-render when stream becomes available
  const [localStream, setLocalStream] = useState(null);

  const [peers, setPeers] = useState([]); // list of peerIds
  const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]

  const [roomState, setRoomState] = useState({
    background: "#F4E6DA",
    layout: {},
  });

  const [error, setError] = useState(null);
  const [status, setStatus] = useState("connecting");

  const wsUrl = useMemo(() => deriveWsUrl(), []);

  const updateRemoteStreamsState = useCallback(() => {
    const entries = [...remoteStreamsRef.current.entries()].map(
      ([id, stream]) => ({ id, stream })
    );
    setRemoteStreams(entries);
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    for (const pc of pcsRef.current.values()) {
      try {
        pc.close();
      } catch {
        // ignore
      }
    }
    pcsRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteStreams([]);
    setPeers([]);
  }, []);

  const disconnect = useCallback(() => {
    closeAllPeerConnections();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, [closeAllPeerConnections]);

  const sendStateUpdate = useCallback(
    (next) => {
      // Use ref to avoid stale role inside stable callbacks
      if (roleRef.current !== "master") return;
      const state = {
        background:
          typeof next.background === "string"
            ? next.background
            : roomState.background,
        layout: next.layout && typeof next.layout === "object" ? next.layout : roomState.layout,
      };
      setRoomState(state);
      safeJsonSend(wsRef.current, { type: "STATE_UPDATE", payload: { state } });
    },
    [roomState]
  );

  const upsertLayoutFor = useCallback(
    (targetId, patch) => {
      const prev = roomState.layout || {};
      const current = prev[targetId] || { x: 40, y: 40, w: 220, h: 220, z: 0 };
      const next = {
        ...prev,
        [targetId]: {
          ...current,
          ...patch,
        },
      };
      sendStateUpdate({ layout: next });
    },
    [roomState.layout, sendStateUpdate]
  );

  const setupPeer = useCallback(
    async (peerId, { initiate }) => {
      if (!clientIdRef.current) return;
      if (pcsRef.current.has(peerId)) return;

      const stream = await ensureLocalMedia();

      const pc = createPeerConnection({
        onIceCandidate: (candidate) => {
          safeJsonSend(wsRef.current, {
            type: "SIGNAL",
            payload: { to: peerId, data: { candidate } },
          });
        },
        onTrack: (remoteStream) => {
          remoteStreamsRef.current.set(peerId, remoteStream);
          updateRemoteStreamsState();
        },
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pcsRef.current.set(peerId, pc);

      if (initiate) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        safeJsonSend(wsRef.current, {
          type: "SIGNAL",
          payload: { to: peerId, data: { sdp: pc.localDescription } },
        });
      }
    },
    [ensureLocalMedia, updateRemoteStreamsState]
  );

  const handleSignal = useCallback(
    async (from, data) => {
      if (!from || !data) return;
      await setupPeer(from, { initiate: false });
      const pc = pcsRef.current.get(from);
      if (!pc) return;

      if (data.sdp) {
        const desc = new RTCSessionDescription(data.sdp);
        await pc.setRemoteDescription(desc);
        if (desc.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          safeJsonSend(wsRef.current, {
            type: "SIGNAL",
            payload: { to: from, data: { sdp: pc.localDescription } },
          });
        }
      }

      if (data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ignore ICE errors
        }
      }
    },
    [setupPeer]
  );

  const doCapture = useCallback(async () => {
    if (!isMaster) return;
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = roomState.background || "#F4E6DA";
    ctx.fillRect(0, 0, width, height);

    // Build list of all video nodes to draw (local + remotes)
    const nodes = [];

    // Local (master/participant)
    if (localVideoRef.current) {
      nodes.push({
        id: clientId,
        videoEl: localVideoRef.current,
        layout: roomState.layout?.[clientId] || null,
      });
    }

    // Remotes
    const remoteVideoEls = stage.querySelectorAll("video[data-peer]");
    remoteVideoEls.forEach((videoEl) => {
      const id = videoEl.getAttribute("data-peer");
      nodes.push({
        id,
        videoEl,
        layout: roomState.layout?.[id] || null,
      });
    });

    // Sort by z
    nodes.sort((a, b) => {
      const za = a.layout?.z ?? 0;
      const zb = b.layout?.z ?? 0;
      return za - zb;
    });

    for (const node of nodes) {
      const layout = node.layout;
      if (!layout) continue;
      const x = clamp(layout.x, -width, width * 2);
      const y = clamp(layout.y, -height, height * 2);
      const w = clamp(layout.w, 1, width * 4);
      const h = clamp(layout.h, 1, height * 4);

      try {
        ctx.drawImage(node.videoEl, x, y, w, h);
      } catch {
        // drawImage can fail if video not ready
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // End session for everyone
    safeJsonSend(wsRef.current, { type: "END_SESSION", payload: { reason: "captured" } });
    onMasterCaptured?.(dataUrl);
  }, [clientId, isMaster, onMasterCaptured, roomState.background, roomState.layout]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setError(null);
        setStatus("connecting");

        // Reset view state for a fresh join (prevents stale role/clientId flicker)
        setClientId(null);
        setRole(null);
        setPeers([]);
        setRemoteStreams([]);

        // Ensure local camera/mic is ready
        await ensureLocalMedia();

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          setStatus("joining");
          safeJsonSend(ws, {
            type: "JOIN",
            payload: {
              roomId,
            },
          });
        };

        ws.onmessage = async (event) => {
          let msg;
          try {
            msg = JSON.parse(String(event.data || ""));
          } catch {
            return;
          }

          if (!mounted) return;

          const { type, payload } = msg;

          if (type === "WELCOME") {
            setClientId(payload.clientId);
            setRole(payload.role);
            setRoomState(
              payload.state || {
                background: "#F4E6DA",
                layout: {},
              }
            );
            setStatus("connected");

            const initialPeers = Array.isArray(payload.peers) ? payload.peers : [];
            setPeers(initialPeers);
            // New joiner initiates to existing peers
            for (const peerId of initialPeers) {
              await setupPeer(peerId, { initiate: true });
            }
            return;
          }

          if (type === "PEER_JOINED") {
            const peerId = payload?.clientId;
            if (!peerId) return;
            setPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
            // Existing peers wait for offers (do not initiate)
            await setupPeer(peerId, { initiate: false });
            if (payload?.state) setRoomState(payload.state);
            return;
          }

          if (type === "PEER_LEFT") {
            const peerId = payload?.clientId;
            if (!peerId) return;
            setPeers((prev) => prev.filter((id) => id !== peerId));
            const pc = pcsRef.current.get(peerId);
            if (pc) {
              try {
                pc.close();
              } catch {
                // ignore
              }
              pcsRef.current.delete(peerId);
            }
            remoteStreamsRef.current.delete(peerId);
            updateRemoteStreamsState();
            return;
          }

          if (type === "SIGNAL") {
            await handleSignal(payload?.from, payload?.data);
            return;
          }

          if (type === "STATE") {
            if (payload?.state) setRoomState(payload.state);
            return;
          }

          if (type === "SESSION_ENDED") {
            setStatus("ended");
            onSessionEnded?.(payload?.reason || "ended");
            disconnect();
            return;
          }

          if (type === "ERROR") {
            setError(payload?.message || "Terjadi kesalahan");
            return;
          }
        };

        ws.onerror = () => {
          if (!mounted) return;
          setError("Koneksi realtime gagal");
        };

        ws.onclose = () => {
          if (!mounted) return;
          setStatus((prev) => (prev === "ended" ? prev : "disconnected"));
        };
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Gagal memulai friends mode");
        setStatus("error");
      }
    };

    run();

    return () => {
      mounted = false;
      disconnect();
    };
  }, [disconnect, ensureLocalMedia, handleSignal, onSessionEnded, roomId, updateRemoteStreamsState, wsUrl, setupPeer]);

  useEffect(() => {
    // keep local video hooked up if ref appears later
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [clientId]);

  const shareLink = useMemo(() => {
    const base = window.location.origin;
    return `${base}/take-moment?room=${encodeURIComponent(roomId)}`;
  }, [roomId]);

  const everyone = useMemo(() => {
    const list = [];
    if (clientId) list.push({ id: clientId, kind: "local" });
    for (const p of peers) list.push({ id: p, kind: "remote" });
    return list.slice(0, MAX_PEOPLE);
  }, [clientId, peers]);

  const stageStyle = {
    width: "min(920px, 100%)",
    aspectRatio: "16 / 9",
    background: roomState.background || "#F4E6DA",
    borderRadius: "18px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(15,23,42,0.12)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.7)",
          borderRadius: "16px",
          padding: "0.9rem",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div style={{ fontWeight: 800, color: "#0F172A" }}>
            Take moment with your friends
          </div>
          <div style={{ fontSize: "0.9rem", color: "rgba(15,23,42,0.7)" }}>
            Status: {status} • Role: {role || "-"}
          </div>
          {error && (
            <div style={{ fontSize: "0.9rem", color: "#B91C1C" }}>{error}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareLink);
              onRoomCreated?.(shareLink);
            }}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid rgba(15,23,42,0.14)",
              background: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Copy link
          </button>

          {isMaster && (
            <>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "999px",
                  background: "white",
                  border: "1px solid rgba(15,23,42,0.14)",
                  fontWeight: 700,
                }}
              >
                Background
                <input
                  type="color"
                  value={roomState.background || "#F4E6DA"}
                  onChange={(e) => sendStateUpdate({ background: e.target.value })}
                  style={{ width: "30px", height: "22px", border: "none" }}
                />
              </label>
              <button
                type="button"
                onClick={doCapture}
                style={{
                  padding: "0.55rem 0.95rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "#0F172A",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Capture (master)
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={stageRef} style={stageStyle}>
        {/* Local video element (hidden UI, but used for rendering/capture) */}
        <video
          ref={localVideoRef}
          muted
          autoPlay
          playsInline
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />

        {everyone.map(({ id, kind }) => {
          const layout = roomState.layout?.[id] || {
            x: 40,
            y: 40,
            w: 220,
            h: 220,
            z: 0,
          };

          const isLocal = kind === "local";
          const canControl = isMaster && !isLocal ? true : isMaster && isLocal;

          const zIndex = layout.z ?? 0;

          const videoProps = isLocal
            ? {
                srcObject: localStream,
              }
            : {
                srcObject:
                  remoteStreamsRef.current.get(id) ||
                  remoteStreams.find((s) => s.id === id)?.stream ||
                  null,
              };

          return (
            <Rnd
              key={id}
              bounds="parent"
              size={{ width: layout.w, height: layout.h }}
              position={{ x: layout.x, y: layout.y }}
              disableDragging={!canControl}
              enableResizing={canControl}
              style={{ zIndex, borderRadius: 14, overflow: "hidden" }}
              onDragStop={(e, d) => {
                if (!isMaster) return;
                upsertLayoutFor(id, { x: d.x, y: d.y });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                if (!isMaster) return;
                const w = ref.offsetWidth;
                const h = ref.offsetHeight;
                upsertLayoutFor(id, { w, h, x: position.x, y: position.y });
              }}
              onMouseDown={() => {
                if (!isMaster) return;
                // Bring to front
                const maxZ = Math.max(
                  0,
                  ...Object.values(roomState.layout || {}).map((l) => l?.z ?? 0)
                );
                upsertLayoutFor(id, { z: maxZ + 1 });
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <video
                  data-peer={isLocal ? undefined : id}
                  autoPlay
                  playsInline
                  muted={isLocal}
                  ref={(el) => {
                    if (!el) return;
                    // Attach stream
                    try {
                      if (videoProps.srcObject && el.srcObject !== videoProps.srcObject) {
                        el.srcObject = videoProps.srcObject;
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: isLocal ? "scaleX(-1)" : "none",
                  }}
                />
              </div>
            </Rnd>
          );
        })}

        {!clientId && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(15,23,42,0.8)",
              fontWeight: 800,
            }}
          >
            Menyambungkan…
          </div>
        )}
      </div>

      {role === "participant" && (
        <div
          style={{
            background: "rgba(255,255,255,0.7)",
            borderRadius: "16px",
            padding: "0.9rem",
            border: "1px solid rgba(15,23,42,0.08)",
            color: "rgba(15,23,42,0.75)",
            fontWeight: 650,
          }}
        >
          Kamu sedang bergabung sebagai peserta. Kamu hanya bisa berbicara dan
          berpose, semua kontrol hanya bisa dilakukan oleh master.
        </div>
      )}
    </div>
  );
}
