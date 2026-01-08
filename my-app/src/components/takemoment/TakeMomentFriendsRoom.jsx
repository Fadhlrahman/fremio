import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { VPS_API_URL } from "../../config/backend";

const MAX_PEOPLE = 4;
const MIRROR_ALL_STREAMS = true;

const TIMER_STEPS = [0, 3, 5, 10];

// Some browsers hard-fail when canvas width*height gets too large.
// 268,435,456 is a common max area (e.g., 16384^2). Keep at-or-below it.
const MAX_CANVAS_AREA = 268435456;
const MAX_CANVAS_DIM = 16384;

const deriveBackendOrigin = () => {
  const api = String(VPS_API_URL || "").trim();

  // If API is relative, backend is same-origin.
  if (!api || api.startsWith("/")) return window.location.origin;

  try {
    return new URL(api).origin;
  } catch {
    return window.location.origin;
  }
};

const deriveMediapipeSelfieBase = () => {
  // Serve MediaPipe assets from backend `/static` so we can guarantee correct MIME types
  // (especially `.wasm` -> `application/wasm`) and long-lived caching.
  return `${deriveBackendOrigin()}/static/mediapipe/selfie_segmentation`;
};

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

const getIceServers = () => {
  // Multiple STUN entries improves odds across networks.
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];

  // Optional TURN for NAT-restricted networks (set in Cloudflare Pages env)
  // - VITE_WEBRTC_TURN_URL: e.g. "turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp"
  // - VITE_WEBRTC_TURN_USERNAME
  // - VITE_WEBRTC_TURN_CREDENTIAL
  const turnUrl = String(import.meta.env?.VITE_WEBRTC_TURN_URL || "").trim();
  if (turnUrl) {
    const urls = turnUrl
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length) {
      servers.push({
        urls,
        username: String(import.meta.env?.VITE_WEBRTC_TURN_USERNAME || "").trim() || undefined,
        credential:
          String(import.meta.env?.VITE_WEBRTC_TURN_CREDENTIAL || "").trim() || undefined,
      });
    }
  }

  return servers;
};

const createPeerConnection = ({ iceServers, onIceCandidate, onTrackEvent }) => {
  const pc = new RTCPeerConnection({
    iceServers: iceServers || getIceServers(),
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate);
  };

  pc.onicecandidateerror = (event) => {
    // eslint-disable-next-line no-console
    console.warn("[friends] ICE candidate error", event);
  };

  pc.ontrack = (event) => {
    onTrackEvent?.(event);
  };

  return pc;
};

const clamp = (value, min, max) => {
  const v = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, v));
};

const finiteOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

const inferLayoutUnits = (layout) => {
  if (!layout || typeof layout !== "object") return "px";
  const rects = Object.values(layout);
  for (const rect of rects) {
    if (!rect || typeof rect !== "object") continue;
    const w = rect.w;
    const h = rect.h;
    // Heuristic: normalized sizes are usually <= 1; px sizes are typically > 10.
    if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0 && w <= 1.5 && h <= 1.5) {
      return "norm";
    }
  }
  return "px";
};

const normalizeIncomingState = (incoming) => {
  const state = incoming && typeof incoming === "object" ? incoming : {};

  const legacyBackground = typeof state.background === "string" ? state.background : null;
  const backgroundColorCandidate =
    typeof state.backgroundColor === "string" ? state.backgroundColor : legacyBackground;
  const backgroundImageCandidate =
    typeof state.backgroundImage === "string" ? state.backgroundImage : null;

  // Back-compat: if legacy background is a URL/dataURL, treat it as an image.
  const backgroundImage =
    backgroundImageCandidate ||
    (legacyBackground &&
    (legacyBackground.startsWith("data:image") ||
      legacyBackground.startsWith("http://") ||
      legacyBackground.startsWith("https://"))
      ? legacyBackground
      : null);

  const backgroundColor =
    typeof backgroundColorCandidate === "string" && backgroundColorCandidate.trim()
      ? backgroundColorCandidate
      : "#F4E6DA";

  const rawLayout = state.layout && typeof state.layout === "object" ? state.layout : {};
  const layoutUnits =
    state.layoutUnits === "norm" || state.layoutUnits === "px"
      ? state.layoutUnits
      : inferLayoutUnits(rawLayout);

  const layout = sanitizeLayout(layoutUnits, rawLayout);

  return { background: backgroundColor, backgroundColor, backgroundImage, layoutUnits, layout };
};

const DEFAULT_TILE_PX = { x: 40, y: 40, w: 220, h: 220, z: 0 };

const getDefaultTileNorm = (stageW, stageH) => {
  if (!stageW || !stageH) {
    return { x: 0.05, y: 0.05, w: 0.28, h: 0.42, z: 0 };
  }
  return {
    x: clamp(DEFAULT_TILE_PX.x / stageW, 0, 0.9),
    y: clamp(DEFAULT_TILE_PX.y / stageH, 0, 0.9),
    w: clamp(DEFAULT_TILE_PX.w / stageW, 0.08, 1),
    h: clamp(DEFAULT_TILE_PX.h / stageH, 0.08, 1),
    z: 0,
  };
};

const normToPx = (norm, stageW, stageH) => {
  if (!norm || !stageW || !stageH) return { ...DEFAULT_TILE_PX };
  return {
    x: Math.round(finiteOr(norm.x, 0) * stageW),
    y: Math.round(finiteOr(norm.y, 0) * stageH),
    w: Math.round(finiteOr(norm.w, DEFAULT_TILE_PX.w / stageW) * stageW),
    h: Math.round(finiteOr(norm.h, DEFAULT_TILE_PX.h / stageH) * stageH),
    z: finiteOr(norm.z, 0),
  };
};

const pxToNorm = (px, stageW, stageH) => {
  if (!px || !stageW || !stageH) return getDefaultTileNorm(stageW, stageH);
  return {
    x: finiteOr(px.x, 0) / stageW,
    y: finiteOr(px.y, 0) / stageH,
    w: finiteOr(px.w, DEFAULT_TILE_PX.w) / stageW,
    h: finiteOr(px.h, DEFAULT_TILE_PX.h) / stageH,
    z: finiteOr(px.z, 0),
  };
};

const sanitizeLayout = (layoutUnits, layout) => {
  const src = layout && typeof layout === "object" ? layout : {};
  const out = {};

  for (const [id, rect] of Object.entries(src)) {
    if (!id) continue;
    const r = rect && typeof rect === "object" ? rect : {};

    if (layoutUnits === "norm") {
      out[id] = clampNormRect({
        x: finiteOr(r.x, 0.05),
        y: finiteOr(r.y, 0.05),
        w: finiteOr(r.w, 0.28),
        h: finiteOr(r.h, 0.42),
        z: finiteOr(r.z, 0),
      });
      out[id].z = finiteOr(r.z, out[id].z ?? 0);
      continue;
    }

    out[id] = {
      x: Math.round(finiteOr(r.x, DEFAULT_TILE_PX.x)),
      y: Math.round(finiteOr(r.y, DEFAULT_TILE_PX.y)),
      w: Math.max(20, Math.round(finiteOr(r.w, DEFAULT_TILE_PX.w))),
      h: Math.max(20, Math.round(finiteOr(r.h, DEFAULT_TILE_PX.h))),
      z: finiteOr(r.z, 0),
    };
  }

  return out;
};

const clampNormRect = (rect) => {
  const w = clamp(finiteOr(rect?.w, 0.2), 0.05, 1);
  const h = clamp(finiteOr(rect?.h, 0.2), 0.05, 1);
  const x = clamp(finiteOr(rect?.x, 0), 0, Math.max(0, 1 - w));
  const y = clamp(finiteOr(rect?.y, 0), 0, Math.max(0, 1 - h));
  return { ...rect, x, y, w, h };
};

export default function TakeMomentFriendsRoom({
  roomId,
  onRoomCreated,
  onMasterCaptured,
  onSessionEnded,
}) {
  const stageRef = useRef(null);
  const wsRef = useRef(null);
  const participantUiTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const localVideoRef = useRef(null);
  const localCutoutCanvasRef = useRef(null);
  const backgroundFileInputRef = useRef(null);
  const localStreamRef = useRef(null);
  const clientIdRef = useRef(null);
  const roleRef = useRef(null);
  const pcsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()); // peerId -> MediaStream
  const pendingIceRef = useRef(new Map()); // peerId -> RTCIceCandidateInit[]
  const iceRestartRef = useRef(new Map()); // peerId -> lastRestartAt(ms)
  const iceServersRef = useRef(null);
  const iceServersExpiresAtRef = useRef(0);
  const iceServersPromiseRef = useRef(null);

  const tileVideoElsRef = useRef(new Map()); // id -> HTMLVideoElement
  const tileCanvasElsRef = useRef(new Map()); // id -> HTMLCanvasElement
  const segmentationPipelinesRef = useRef(new Map()); // id -> { seg, rafId, stopped }

  const mediapipeLoadPromiseRef = useRef(null);
  const mediapipeWarmupStartedRef = useRef(false);

  const [segmentationStatus, setSegmentationStatus] = useState({}); // id -> 'pending' | 'ready' | 'failed'
  const segmentationStatusRef = useRef({});
  const setSegStatus = useCallback((id, status) => {
    if (!id) return;
    segmentationStatusRef.current = { ...segmentationStatusRef.current, [id]: status };
    setSegmentationStatus((prev) => (prev?.[id] === status ? prev : { ...prev, [id]: status }));
  }, []);

  const [clientId, setClientId] = useState(null);
  const [role, setRole] = useState(null); // 'master' | 'participant'
  const isMaster = role === "master";

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Track each stream's intrinsic aspect ratio (width/height) so tiles never stretch.
  const aspectByIdRef = useRef({});
  const [aspectById, setAspectById] = useState({});
  const upsertAspectForId = useCallback((id, aspect) => {
    if (!id) return;
    const ar = Number(aspect);
    if (!Number.isFinite(ar) || ar <= 0.05 || ar >= 20) return;
    const prev = aspectByIdRef.current?.[id];
    if (Number.isFinite(prev) && Math.abs(prev - ar) < 0.0001) return;

    aspectByIdRef.current = { ...(aspectByIdRef.current || {}), [id]: ar };
    setAspectById((curr) => {
      const currentVal = curr?.[id];
      if (Number.isFinite(currentVal) && Math.abs(currentVal - ar) < 0.0001) return curr;
      return { ...(curr || {}), [id]: ar };
    });
  }, []);

  const getAspectForId = useCallback((id) => {
    const ar = aspectByIdRef.current?.[id];
    return Number.isFinite(ar) ? ar : null;
  }, []);

  // Prevent auto-layout from overriding master's manual adjustments.
  const userAdjustedLayoutRef = useRef(false);

  const [showParticipantCapture, setShowParticipantCapture] = useState(false);
  const [participantCaptureUrl, setParticipantCaptureUrl] = useState(null);

  const clearParticipantUiTimer = useCallback(() => {
    if (participantUiTimerRef.current) {
      try {
        clearTimeout(participantUiTimerRef.current);
      } catch {
        // ignore
      }
      participantUiTimerRef.current = null;
    }
  }, []);

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) {
      try {
        clearInterval(countdownIntervalRef.current);
      } catch {
        // ignore
      }
      countdownIntervalRef.current = null;
    }
  }, []);

  const showParticipantCaptureNotice = useCallback(
    ({ dataUrl }) => {
      setParticipantCaptureUrl(typeof dataUrl === "string" ? dataUrl : null);
      setShowParticipantCapture(true);

      // Keep visible briefly even if session ends right after.
      clearParticipantUiTimer();
      participantUiTimerRef.current = setTimeout(() => {
        setShowParticipantCapture(false);
        setParticipantCaptureUrl(null);
      }, 2000);
    },
    [clearParticipantUiTimer]
  );

  const sendRoomEvent = useCallback(
    (payload) => {
      if (!isMaster) return;
      safeJsonSend(wsRef.current, { type: "ROOM_EVENT", payload });
    },
    [isMaster]
  );

  const buildStandardDefaultLayout = useCallback((ids) => {
    const list = Array.isArray(ids) ? ids.slice(0, MAX_PEOPLE) : [];
    const n = list.length;
    const layout = {};

    if (n <= 0) return layout;

    if (n === 1) {
      layout[list[0]] = { x: 0.2, y: 0.1, w: 0.6, h: 0.8, z: 0 };
      return layout;
    }

    if (n === 2) {
      // Master slightly left of horizontal center, participant to the right.
      layout[list[0]] = { x: 0.12, y: 0.12, w: 0.36, h: 0.76, z: 0 };
      layout[list[1]] = { x: 0.52, y: 0.12, w: 0.36, h: 0.76, z: 1 };
      return layout;
    }

    if (n === 3) {
      // Master + participant 1 on top (slightly shifted up), participant 2 below centered.
      layout[list[0]] = { x: 0.12, y: 0.06, w: 0.36, h: 0.42, z: 0 };
      layout[list[1]] = { x: 0.52, y: 0.06, w: 0.36, h: 0.42, z: 1 };
      layout[list[2]] = { x: 0.3, y: 0.52, w: 0.4, h: 0.42, z: 2 };
      return layout;
    }

    // 4
    layout[list[0]] = { x: 0.06, y: 0.07, w: 0.42, h: 0.42, z: 0 };
    layout[list[1]] = { x: 0.52, y: 0.07, w: 0.42, h: 0.42, z: 1 };
    layout[list[2]] = { x: 0.06, y: 0.54, w: 0.42, h: 0.42, z: 2 };
    layout[list[3]] = { x: 0.52, y: 0.54, w: 0.42, h: 0.42, z: 3 };
    return layout;
  }, []);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const pinchStateRef = useRef(null); // { id, startDist, startNorm, centerX, centerY, latestScale }
  const pinchRafRef = useRef(null);
  const [pinchingTileId, setPinchingTileId] = useState(null);
  const tileTouchCleanupRef = useRef(new Map()); // id -> () => void
  const pointerPointsRef = useRef(new Map()); // pointerId -> { x, y }

  // Keep refs in sync so callbacks can be stable
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const getTouchDistance = useCallback((touches) => {
    if (!touches || touches.length < 2) return 0;
    const t0 = touches[0];
    const t1 = touches[1];
    const dx = (t1?.clientX ?? 0) - (t0?.clientX ?? 0);
    const dy = (t1?.clientY ?? 0) - (t0?.clientY ?? 0);
    return Math.hypot(dx, dy);
  }, []);

  const clearPinch = useCallback(() => {
    if (pinchRafRef.current) {
      try {
        cancelAnimationFrame(pinchRafRef.current);
      } catch {
        // ignore
      }
      pinchRafRef.current = null;
    }
    pinchStateRef.current = null;
    setPinchingTileId(null);
  }, []);

  useEffect(() => {
    return () => {
      clearPinch();
      // Cleanup any per-tile native listeners
      for (const cleanup of tileTouchCleanupRef.current.values()) {
        try {
          cleanup?.();
        } catch {
          // ignore
        }
      }
      tileTouchCleanupRef.current.clear();
    };
  }, [clearPinch]);

  const startPinchForTile = useCallback(
    (tileId, touches) => {
      const baseLayout = ensureNormLayoutNow();
      if (!baseLayout) return;
      const currentNorm =
        baseLayout?.[tileId] || getDefaultTileNorm(stageSize.w, stageSize.h);
      const startDist = getTouchDistance(touches);
      if (!startDist) return;

      const centerX = (currentNorm.x ?? 0) + (currentNorm.w ?? 0) / 2;
      const centerY = (currentNorm.y ?? 0) + (currentNorm.h ?? 0) / 2;

      pinchStateRef.current = {
        id: tileId,
        startDist,
        startNorm: currentNorm,
        centerX,
        centerY,
        latestScale: 1,
      };
      setPinchingTileId(tileId);
    },
    [getTouchDistance, stageSize.w, stageSize.h]
  );

  const updatePinchScale = useCallback(
    (tileId, touches) => {
      const state = pinchStateRef.current;
      if (!state || state.id !== tileId) return;
      const dist = getTouchDistance(touches);
      if (!dist || !state.startDist) return;
      const scale = clamp(dist / state.startDist, 0.25, 4);
      state.latestScale = scale;

      if (pinchRafRef.current) return;
      pinchRafRef.current = requestAnimationFrame(() => {
        pinchRafRef.current = null;
        const s = pinchStateRef.current;
        if (!s || s.id !== tileId) return;

        const start = s.startNorm || getDefaultTileNorm(stageSize.w, stageSize.h);
        const nextW = (start.w ?? 0.2) * (s.latestScale ?? 1);
        const nextH = (start.h ?? 0.2) * (s.latestScale ?? 1);
        const nextX = (s.centerX ?? 0) - nextW / 2;
        const nextY = (s.centerY ?? 0) - nextH / 2;

        const nextNorm = clampNormRect({
          ...start,
          w: nextW,
          h: nextH,
          x: nextX,
          y: nextY,
        });
        upsertLayoutFor(tileId, nextNorm);
      });
    },
    [getTouchDistance, stageSize.w, stageSize.h]
  );

  const bindTileTouchSurface = useCallback(
    (tileId, el) => {
      const prev = tileTouchCleanupRef.current.get(tileId);
      if (prev) {
        try {
          prev();
        } catch {
          // ignore
        }
        tileTouchCleanupRef.current.delete(tileId);
      }

      if (!el || !isMaster) return;

      // Help browsers route pinch/scroll behavior to JS (Pointer Events path).
      try {
        el.style.touchAction = "none";
      } catch {
        // ignore
      }

      const onStart = (e) => {
        if (!roleRef.current || roleRef.current !== "master") return;
        if (!e?.touches || e.touches.length !== 2) return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        setSelectedTileId(tileId);
        startPinchForTile(tileId, e.touches);
      };

      const onMove = (e) => {
        const state = pinchStateRef.current;
        if (!state || state.id !== tileId) return;
        if (!e?.touches || e.touches.length !== 2) return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        updatePinchScale(tileId, e.touches);
      };

      const onEnd = (e) => {
        const state = pinchStateRef.current;
        if (!state || state.id !== tileId) return;
        if (e?.touches && e.touches.length >= 2) return;
        clearPinch();
      };

      // Pointer Events path (best on modern Android + iOS)
      const onPointerDown = (e) => {
        if (e?.pointerType !== "touch") return;
        if (!roleRef.current || roleRef.current !== "master") return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        try {
          el.setPointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
        pointerPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointerPointsRef.current.size === 2) {
          // synthesize touches-like array to reuse logic
          const pts = [...pointerPointsRef.current.values()].map((p) => ({ clientX: p.x, clientY: p.y }));
          setSelectedTileId(tileId);
          startPinchForTile(tileId, pts);
        }
      };

      const onPointerMove = (e) => {
        if (e?.pointerType !== "touch") return;
        const state = pinchStateRef.current;
        if (!state || state.id !== tileId) return;
        if (!pointerPointsRef.current.has(e.pointerId)) return;
        pointerPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointerPointsRef.current.size !== 2) return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        const pts = [...pointerPointsRef.current.values()].map((p) => ({ clientX: p.x, clientY: p.y }));
        updatePinchScale(tileId, pts);
      };

      const onPointerUp = (e) => {
        if (e?.pointerType !== "touch") return;
        pointerPointsRef.current.delete(e.pointerId);
        if (pointerPointsRef.current.size < 2) {
          const state = pinchStateRef.current;
          if (state && state.id === tileId) clearPinch();
        }
      };

      // iOS Safari fallback (non-standard)
      let gestureStartScale = 1;
      const onGestureStart = (e) => {
        if (!roleRef.current || roleRef.current !== "master") return;
        // @ts-ignore
        if (typeof e?.scale !== "number") return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        gestureStartScale = e.scale || 1;
        // seed pinch state from current layout
        const baseLayout = ensureNormLayoutNow();
        if (!baseLayout) return;
        const currentNorm = baseLayout?.[tileId] || getDefaultTileNorm(stageSize.w, stageSize.h);
        pinchStateRef.current = {
          id: tileId,
          startDist: 1,
          startNorm: currentNorm,
          centerX: (currentNorm.x ?? 0) + (currentNorm.w ?? 0) / 2,
          centerY: (currentNorm.y ?? 0) + (currentNorm.h ?? 0) / 2,
          latestScale: 1,
        };
        setPinchingTileId(tileId);
        setSelectedTileId(tileId);
      };

      const onGestureChange = (e) => {
        const state = pinchStateRef.current;
        if (!state || state.id !== tileId) return;
        // @ts-ignore
        if (typeof e?.scale !== "number") return;
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        const rel = (e.scale || 1) / (gestureStartScale || 1);
        state.latestScale = clamp(rel, 0.25, 4);
        if (pinchRafRef.current) return;
        pinchRafRef.current = requestAnimationFrame(() => {
          pinchRafRef.current = null;
          const s = pinchStateRef.current;
          if (!s || s.id !== tileId) return;
          const start = s.startNorm || getDefaultTileNorm(stageSize.w, stageSize.h);
          const nextW = (start.w ?? 0.2) * (s.latestScale ?? 1);
          const nextH = (start.h ?? 0.2) * (s.latestScale ?? 1);
          const nextX = (s.centerX ?? 0) - nextW / 2;
          const nextY = (s.centerY ?? 0) - nextH / 2;
          const nextNorm = clampNormRect({ ...start, w: nextW, h: nextH, x: nextX, y: nextY });
          upsertLayoutFor(tileId, nextNorm);
        });
      };

      const onGestureEnd = () => {
        const state = pinchStateRef.current;
        if (!state || state.id !== tileId) return;
        clearPinch();
      };

      // Non-passive listeners so preventDefault works (esp. iOS)
      el.addEventListener("touchstart", onStart, { passive: false, capture: true });
      el.addEventListener("touchmove", onMove, { passive: false, capture: true });
      el.addEventListener("touchend", onEnd, { passive: true, capture: true });
      el.addEventListener("touchcancel", onEnd, { passive: true, capture: true });

      el.addEventListener("pointerdown", onPointerDown, { capture: true });
      el.addEventListener("pointermove", onPointerMove, { capture: true });
      el.addEventListener("pointerup", onPointerUp, { capture: true });
      el.addEventListener("pointercancel", onPointerUp, { capture: true });

      el.addEventListener("gesturestart", onGestureStart, { passive: false, capture: true });
      el.addEventListener("gesturechange", onGestureChange, { passive: false, capture: true });
      el.addEventListener("gestureend", onGestureEnd, { passive: true, capture: true });

      const cleanup = () => {
        try {
          el.removeEventListener("touchstart", onStart, true);
          el.removeEventListener("touchmove", onMove, true);
          el.removeEventListener("touchend", onEnd, true);
          el.removeEventListener("touchcancel", onEnd, true);

          el.removeEventListener("pointerdown", onPointerDown, true);
          el.removeEventListener("pointermove", onPointerMove, true);
          el.removeEventListener("pointerup", onPointerUp, true);
          el.removeEventListener("pointercancel", onPointerUp, true);

          el.removeEventListener("gesturestart", onGestureStart, true);
          el.removeEventListener("gesturechange", onGestureChange, true);
          el.removeEventListener("gestureend", onGestureEnd, true);
        } catch {
          // ignore
        }
      };

      tileTouchCleanupRef.current.set(tileId, cleanup);
    },
    [clearPinch, isMaster, stageSize.h, stageSize.w, startPinchForTile, updatePinchScale]
  );

  // Use state so video tiles re-render when stream becomes available
  const [localStream, setLocalStream] = useState(null);

  // Mobile/iOS can block autoplay with audio unless play() is invoked from a user gesture.
  const kickstartedPlaybackRef = useRef(false);
  const kickstartPlayback = useCallback(() => {
    if (kickstartedPlaybackRef.current) return;
    kickstartedPlaybackRef.current = true;
    for (const el of tileVideoElsRef.current.values()) {
      try {
        const p = el?.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        // ignore
      }
    }
    try {
      const p = localVideoRef.current?.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const [peers, setPeers] = useState([]); // list of peerIds
  const [remoteStreams, setRemoteStreams] = useState([]); // [{id, stream}]

  const [roomState, setRoomState] = useState({
    background: "#F4E6DA", // legacy
    backgroundColor: "#F4E6DA",
    backgroundImage: null,
    layoutUnits: "norm", // 'norm' (0..1) | legacy 'px'
    layout: {},
  });

  const roomStateRef = useRef(roomState);
  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  const [error, setError] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [selectedTileId, setSelectedTileId] = useState(null);

  const wsUrl = useMemo(() => deriveWsUrl(), []);

  const ensureIceServers = useCallback(async () => {
    const now = Date.now();
    if (Array.isArray(iceServersRef.current) && now < (iceServersExpiresAtRef.current || 0)) {
      return iceServersRef.current;
    }
    if (iceServersPromiseRef.current) return iceServersPromiseRef.current;

    const run = async () => {
      // Always keep a working fallback.
      const fallback = getIceServers();

      try {
        const api = String(VPS_API_URL || "").trim();
        if (!api) return fallback;

        const apiBase = api.startsWith("/") ? `${window.location.origin}${api}` : api;
        const url = `${apiBase.replace(/\/$/, "")}/webrtc/turn`;

        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) return fallback;
        const json = await resp.json();

        const servers = Array.isArray(json?.iceServers) ? json.iceServers : null;
        const ttl = Number(json?.ttlSeconds || 0);

        if (servers && servers.length) {
          iceServersRef.current = servers;
          // refresh a bit before expiry
          const ms = Math.max(30_000, Math.min(6 * 60 * 60 * 1000, (ttl || 3600) * 1000));
          iceServersExpiresAtRef.current = Date.now() + Math.floor(ms * 0.8);
          return servers;
        }

        return fallback;
      } catch {
        return fallback;
      } finally {
        iceServersPromiseRef.current = null;
      }
    };

    iceServersPromiseRef.current = run();
    return iceServersPromiseRef.current;
  }, []);

  const shouldInitiateOffer = useCallback((peerId) => {
    const self = String(clientIdRef.current || "");
    const other = String(peerId || "");
    if (!self || !other) return false;
    // Deterministic: only one side creates offer to avoid deadlocks
    return self.localeCompare(other) < 0;
  }, []);

  const requestIceRestart = useCallback(
    async (peerId, reason) => {
      const pc = pcsRef.current.get(peerId);
      if (!pc) return;

      const now = Date.now();
      const last = iceRestartRef.current.get(peerId) || 0;
      if (now - last < 8000) return; // throttle
      iceRestartRef.current.set(peerId, now);

      const initiator = shouldInitiateOffer(peerId);

      // eslint-disable-next-line no-console
      console.log("[friends] ICE restart", { peerId, initiator, reason, state: pc.iceConnectionState });

      if (!initiator) {
        // Ask the initiator to restart ICE (some browsers behave better).
        safeJsonSend(wsRef.current, {
          type: "SIGNAL",
          payload: { to: peerId, data: { iceRestartRequest: true, reason: String(reason || "") } },
        });
        return;
      }

      try {
        pc.restartIce?.();
      } catch {
        // ignore
      }

      // Only renegotiate when stable.
      if (pc.signalingState !== "stable") return;

      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        safeJsonSend(wsRef.current, {
          type: "SIGNAL",
          payload: { to: peerId, data: { sdp: pc.localDescription } },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[friends] ICE restart offer failed", peerId, e);
      }
    },
    [shouldInitiateOffer]
  );

  const updateRemoteStreamsState = useCallback(() => {
    const entries = [...remoteStreamsRef.current.entries()].map(
      ([id, stream]) => ({ id, stream })
    );
    setRemoteStreams(entries);
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
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
    } catch {
      // Allow joining in recvonly mode if camera/mic is unavailable (common in in-app browsers).
      return null;
    }
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
    pendingIceRef.current.clear();
    setRemoteStreams([]);
    setPeers([]);

    for (const pipe of segmentationPipelinesRef.current.values()) {
      pipe.stopped = true;
      try {
        if (pipe.rafId) cancelAnimationFrame(pipe.rafId);
      } catch {
        // ignore
      }
      try {
        pipe.seg?.close?.();
      } catch {
        // ignore
      }
    }
    segmentationPipelinesRef.current.clear();
    tileVideoElsRef.current.clear();
    tileCanvasElsRef.current.clear();

    segmentationStatusRef.current = {};
    setSegmentationStatus({});
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

  const ensureMediapipeSelfieSegmentationLoaded = useCallback(() => {
    if (globalThis?.SelfieSegmentation) return Promise.resolve(true);
    if (mediapipeLoadPromiseRef.current) return mediapipeLoadPromiseRef.current;

    const src = `${deriveMediapipeSelfieBase()}/selfie_segmentation.js`;

    mediapipeLoadPromiseRef.current = new Promise((resolve, reject) => {
      try {
        const existing = document.querySelector(`script[data-mediapipe-selfie][src="${src}"]`);
        if (existing) {
          existing.addEventListener("load", () => resolve(true), { once: true });
          existing.addEventListener("error", () => reject(new Error("mediapipe script failed")), {
            once: true,
          });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.dataset.mediapipeSelfie = "1";
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error("mediapipe script failed"));
        document.head.appendChild(script);
      } catch (e) {
        reject(e);
      }
    })
      .then(() => Boolean(globalThis?.SelfieSegmentation))
      .catch(() => false);

    return mediapipeLoadPromiseRef.current;
  }, []);

  // Warm up MediaPipe as early as possible so cutout becomes ready faster.
  // Note: first-time load still depends on network + wasm/model initialization, so it can't be truly instant.
  useEffect(() => {
    if (mediapipeWarmupStartedRef.current) return;
    mediapipeWarmupStartedRef.current = true;

    let cancelled = false;
    (async () => {
      const ok = await ensureMediapipeSelfieSegmentationLoaded();
      if (!ok || cancelled) return;

      try {
        const SelfieSegmentationCtor = globalThis?.SelfieSegmentation;
        if (!SelfieSegmentationCtor) return;

        const base = deriveMediapipeSelfieBase();

        const seg = new SelfieSegmentationCtor({
          locateFile: (file) => `${base}/${file}`,
        });

        try {
          seg.setOptions?.({ modelSelection: 1, selfieMode: false });
        } catch {
          // ignore
        }

        // Force initialization/download of wasm+model.
        await Promise.resolve(seg.initialize?.());

        try {
          seg.close?.();
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureMediapipeSelfieSegmentationLoaded]);

  const ensureSegmentationPipeline = useCallback((id, isLocal) => {
    const videoEl = tileVideoElsRef.current.get(id);
    const canvasEl = tileCanvasElsRef.current.get(id);
    if (!videoEl || !canvasEl) return;

    if (segmentationPipelinesRef.current.has(id)) return;

    setSegStatus(id, "pending");

    const start = () => {
      const SelfieSegmentationCtor = globalThis?.SelfieSegmentation;
      if (!SelfieSegmentationCtor) {
        setSegStatus(id, "failed");
        return;
      }

      const base = deriveMediapipeSelfieBase();

      const seg = new SelfieSegmentationCtor({
        locateFile: (file) => `${base}/${file}`,
      });

      // We apply mirroring uniformly at render/capture time.
      seg.setOptions({ modelSelection: 1, selfieMode: false });

      let hasResults = false;
      let consecutiveErrors = 0;

      seg.onResults((results) => {
        if (!hasResults) {
          hasResults = true;
          setSegStatus(id, "ready");
        }
        consecutiveErrors = 0;

        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;

        const cssW = Math.max(1, Math.floor(canvasEl.clientWidth || 1));
        const cssH = Math.max(1, Math.floor(canvasEl.clientHeight || 1));
        const dpr = window.devicePixelRatio || 1;
        let w = Math.max(1, Math.floor(cssW * dpr));
        let h = Math.max(1, Math.floor(cssH * dpr));

        w = Math.min(MAX_CANVAS_DIM, w);
        h = Math.min(MAX_CANVAS_DIM, h);
        const area = w * h;
        if (area > MAX_CANVAS_AREA) {
          const scale = Math.sqrt(MAX_CANVAS_AREA / area);
          w = Math.max(1, Math.floor(w * scale));
          h = Math.max(1, Math.floor(h * scale));
        }

        if (canvasEl.width !== w || canvasEl.height !== h) {
          canvasEl.width = w;
          canvasEl.height = h;
        }

        ctx.save();
        ctx.clearRect(0, 0, w, h);

        // Mask first, then draw only the person pixels.
        ctx.drawImage(results.segmentationMask, 0, 0, w, h);
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(results.image, 0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";

        ctx.restore();
      });

      const pipeline = { seg, rafId: null, stopped: false };
      segmentationPipelinesRef.current.set(id, pipeline);

      const loop = async () => {
        const current = segmentationPipelinesRef.current.get(id);
        if (!current || current.stopped) return;
        try {
          if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            await seg.send({ image: videoEl });
          }
        } catch {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 30 && !hasResults) {
            // If we can't get any results after many attempts (often wasm/model blocked), fall back to raw video.
            setSegStatus(id, "failed");
            current.stopped = true;
            try {
              current.seg?.close?.();
            } catch {
              // ignore
            }
            segmentationPipelinesRef.current.delete(id);
            return;
          }
        }

        current.rafId = requestAnimationFrame(loop);
      };

      // Some environments need explicit initialization; if init fails we fall back.
      Promise.resolve()
        .then(() => seg.initialize?.())
        .then(() => {
          if (!segmentationPipelinesRef.current.has(id)) return;
          pipeline.rafId = requestAnimationFrame(loop);
        })
        .catch(() => {
          setSegStatus(id, "failed");
          pipeline.stopped = true;
          try {
            pipeline.seg?.close?.();
          } catch {
            // ignore
          }
          segmentationPipelinesRef.current.delete(id);
        });
    };

    if (globalThis?.SelfieSegmentation) {
      start();
      return;
    }

    ensureMediapipeSelfieSegmentationLoaded().then((ok) => {
      if (!ok) {
        setSegStatus(id, "failed");
        return;
      }
      start();
    });
  }, [ensureMediapipeSelfieSegmentationLoaded, setSegStatus]);

  const sendStateUpdate = useCallback(
    (next) => {
      // Use ref to avoid stale role inside stable callbacks
      if (roleRef.current !== "master") return;
      const backgroundColor =
        typeof next.backgroundColor === "string"
          ? next.backgroundColor
          : (roomState.backgroundColor ||
              (typeof roomState.background === "string" ? roomState.background : "#F4E6DA") ||
              "#F4E6DA");

      const backgroundImage =
        next.backgroundImage === null
          ? null
          : (typeof next.backgroundImage === "string"
              ? next.backgroundImage
              : (roomState.backgroundImage || null));

      const state = {
        // Back-compat for older payload consumers
        background: backgroundColor,
        backgroundColor,
        backgroundImage,
        layoutUnits: "norm",
        layout:
          next.layout && typeof next.layout === "object" ? next.layout : roomState.layout,
      };
      setRoomState(state);
      safeJsonSend(wsRef.current, { type: "STATE_UPDATE", payload: { state } });
    },
    [roomState]
  );

  const applyAutoLayoutIfNeeded = useCallback(() => {
    if (!isMaster) return;
    if (!stageSize.w || !stageSize.h) return;
    if (!clientId) return;
    if (roomState.layoutUnits !== "norm") return;
    if (userAdjustedLayoutRef.current) return;

    const ids = [clientId, ...peers].slice(0, MAX_PEOPLE);
    const desired = buildStandardDefaultLayout(ids);
    const current = roomState.layout || {};

    let changed = false;
    const next = { ...current };
    for (const id of ids) {
      const want = desired[id];
      if (!want) continue;

      const prev = current[id];
      const same =
        prev &&
        Math.abs((prev.x ?? 0) - want.x) < 0.001 &&
        Math.abs((prev.y ?? 0) - want.y) < 0.001 &&
        Math.abs((prev.w ?? 0) - want.w) < 0.001 &&
        Math.abs((prev.h ?? 0) - want.h) < 0.001;
      if (!same) {
        next[id] = want;
        changed = true;
      }
    }

    if (changed) sendStateUpdate({ layout: next });
  }, [buildStandardDefaultLayout, clientId, isMaster, peers, roomState.layout, roomState.layoutUnits, sendStateUpdate, stageSize.h, stageSize.w]);

  const resizeImageFileToDataUrl = useCallback(async (file, { maxDim = 1600, quality = 0.88 } = {}) => {
    if (!file) return null;
    const blobUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
        img.src = blobUrl;
      });

      const iw = img.naturalWidth || img.width || 1;
      const ih = img.naturalHeight || img.height || 1;
      const scale = Math.min(1, maxDim / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * scale));
      const h = Math.max(1, Math.round(ih * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleBackgroundFileChange = useCallback(
    async (e) => {
      if (!isMaster) return;
      const file = e?.target?.files?.[0] || null;
      // allow selecting the same file again
      try {
        if (e?.target) e.target.value = "";
      } catch {
        // ignore
      }

      if (!file) return;
      const dataUrl = await resizeImageFileToDataUrl(file);
      if (!dataUrl) return;
      sendStateUpdate({ backgroundImage: dataUrl });
    },
    [isMaster, resizeImageFileToDataUrl, sendStateUpdate]
  );

  const upsertLayoutFor = useCallback(
    (targetId, patch) => {
      const prev = roomState.layout || {};
      const current = prev[targetId] || getDefaultTileNorm(0, 0);
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

      const effectiveInitiate =
        typeof initiate === "boolean" ? initiate : shouldInitiateOffer(peerId);

      // eslint-disable-next-line no-console
      console.log("[friends] setupPeer", {
        self: clientIdRef.current,
        peerId,
        initiate: effectiveInitiate,
      });

      const stream = await ensureLocalMedia();

      const iceServers = await ensureIceServers();
      const pc = createPeerConnection({
        iceServers,
        onIceCandidate: (candidate) => {
          // eslint-disable-next-line no-console
          console.log("[friends] send ICE ->", peerId);
          safeJsonSend(wsRef.current, {
            type: "SIGNAL",
            payload: { to: peerId, data: { candidate } },
          });
        },
        onTrackEvent: (event) => {
          // eslint-disable-next-line no-console
          console.log("[friends] ontrack from", peerId, {
            hasStreams: Boolean(event.streams && event.streams[0]),
            trackKind: event.track?.kind,
          });
          // Safari can provide empty event.streams; build a stream from tracks.
          let stream = (event.streams && event.streams[0]) || remoteStreamsRef.current.get(peerId);
          if (!stream) {
            stream = new MediaStream();
          }

          const track = event.track;
          if (track && !stream.getTracks().some((t) => t.id === track.id)) {
            try {
              stream.addTrack(track);
            } catch {
              // ignore
            }
          }

          remoteStreamsRef.current.set(peerId, stream);
          updateRemoteStreamsState();
        },
      });

      // Helpful diagnostics in console (no UI changes)
      pc.oniceconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        console.log("[friends] ICE state", peerId, pc.iceConnectionState);

        if (pc.iceConnectionState === "failed") {
          requestIceRestart(peerId, "ice_failed");
        }
      };
      pc.onconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        console.log("[friends] PC state", peerId, pc.connectionState);

        if (pc.connectionState === "failed") {
          requestIceRestart(peerId, "pc_failed");
        }
      };

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } else {
        // Still receive remote audio/video even if we can't publish.
        try {
          pc.addTransceiver("video", { direction: "recvonly" });
          pc.addTransceiver("audio", { direction: "recvonly" });
        } catch {
          // ignore
        }
      }
      pcsRef.current.set(peerId, pc);

      if (effectiveInitiate) {
        try {
          // eslint-disable-next-line no-console
          console.log("[friends] createOffer ->", peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          // eslint-disable-next-line no-console
          console.log("[friends] send SDP offer ->", peerId);
          safeJsonSend(wsRef.current, {
            type: "SIGNAL",
            payload: { to: peerId, data: { sdp: pc.localDescription } },
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[friends] createOffer failed", peerId, e);
        }
      }
    },
    [ensureIceServers, ensureLocalMedia, requestIceRestart, shouldInitiateOffer, updateRemoteStreamsState]
  );

  const handleSignal = useCallback(
    async (from, data) => {
      if (!from || !data) return;

      // Peer asked us to restart ICE (we might be the initiator).
      if (data.iceRestartRequest) {
        await requestIceRestart(from, data.reason || "peer_request");
        return;
      }

      // eslint-disable-next-line no-console
      console.log("[friends] recv SIGNAL <-", from, {
        hasSdp: Boolean(data.sdp),
        sdpType: data.sdp?.type,
        hasCandidate: Boolean(data.candidate),
      });

      await setupPeer(from, { initiate: false });
      const pc = pcsRef.current.get(from);
      if (!pc) return;

      const drainPendingIce = async () => {
        const queued = pendingIceRef.current.get(from);
        if (!queued || queued.length === 0) return;
        pendingIceRef.current.delete(from);
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore
          }
        }
      };

      if (data.sdp) {
        const desc = new RTCSessionDescription(data.sdp);
        await pc.setRemoteDescription(desc);

        // eslint-disable-next-line no-console
        console.log("[friends] setRemoteDescription", from, desc.type);

        // Some browsers can deliver ICE candidates before SDP; buffer then apply after SDP
        await drainPendingIce();

        if (desc.type === "offer") {
          // eslint-disable-next-line no-console
          console.log("[friends] createAnswer ->", from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          // eslint-disable-next-line no-console
          console.log("[friends] send SDP answer ->", from);
          safeJsonSend(wsRef.current, {
            type: "SIGNAL",
            payload: { to: from, data: { sdp: pc.localDescription } },
          });
        }
      }

      if (data.candidate) {
        // If remoteDescription isn't set yet, queue; otherwise add immediately
        if (!pc.remoteDescription) {
          const existing = pendingIceRef.current.get(from) || [];
          existing.push(data.candidate);
          pendingIceRef.current.set(from, existing);

          // eslint-disable-next-line no-console
          console.log("[friends] queue ICE (no remoteDescription yet)", from);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ignore ICE errors
        }
      }
    },
    [requestIceRestart, setupPeer]
  );

  const doCapture = useCallback(async () => {
    if (!isMaster) return;
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    let width = Math.max(1, Math.floor(rect.width));
    let height = Math.max(1, Math.floor(rect.height));

    width = Math.min(MAX_CANVAS_DIM, width);
    height = Math.min(MAX_CANVAS_DIM, height);
    const area = width * height;
    if (area > MAX_CANVAS_AREA) {
      const scale = Math.sqrt(MAX_CANVAS_AREA / area);
      width = Math.max(1, Math.floor(width * scale));
      height = Math.max(1, Math.floor(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background (image cover if present, else solid color)
    const bgColor = roomState.backgroundColor || "#F4E6DA";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const bgImg = roomState.backgroundImage;
    if (typeof bgImg === "string" && bgImg) {
      try {
        const img = new Image();
        img.decoding = "async";
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("background image load failed"));
          img.src = bgImg;
        });

        // cover
        const iw = img.naturalWidth || img.width || 1;
        const ih = img.naturalHeight || img.height || 1;
        const scale = Math.max(width / iw, height / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } catch {
        // ignore background draw failures, keep solid color
      }
    }

    // Build list of all nodes to draw (prefer cutout canvas if ready; otherwise raw video)
    const nodes = [];
    const ids = new Set(Object.keys(roomState.layout || {}));
    if (clientId) ids.add(clientId);

    for (const id of ids) {
      const layout = roomState.layout?.[id] || null;
      if (!layout) continue;

      const status = segmentationStatusRef.current?.[id];
      const canvasEl = tileCanvasElsRef.current.get(id);
      const videoEl = tileVideoElsRef.current.get(id);

      const sourceEl = status === "ready" && canvasEl ? canvasEl : videoEl || canvasEl;
      if (!sourceEl) continue;

      const arFromVideo =
        videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0
          ? videoEl.videoWidth / videoEl.videoHeight
          : null;
      const aspect = Number.isFinite(arFromVideo) ? arFromVideo : getAspectForId(id);

      nodes.push({ id, sourceEl, layout, aspect });
    }

    // Sort by z
    nodes.sort((a, b) => {
      const za = a.layout?.z ?? 0;
      const zb = b.layout?.z ?? 0;
      return za - zb;
    });

    for (const node of nodes) {
      const layout = node.layout;
      if (!layout) continue;

      const rectPx =
        roomState.layoutUnits === "norm"
          ? normToPx(layout, width, height)
          : layout;

      const x = clamp(rectPx.x, -width, width * 2);
      const y = clamp(rectPx.y, -height, height * 2);
      let w = clamp(rectPx.w, 1, width * 4);
      let h = clamp(rectPx.h, 1, height * 4);

      const ar = Number(node.aspect);
      if (Number.isFinite(ar) && ar > 0.05 && ar < 20) {
        const hFromW = w / ar;
        const wFromH = h * ar;
        if (Number.isFinite(hFromW) && Number.isFinite(wFromH)) {
          if (Math.abs(hFromW - h) <= Math.abs(wFromH - w)) {
            h = hFromW;
          } else {
            w = wFromH;
          }
        }
      }

      try {
        if (MIRROR_ALL_STREAMS) {
          ctx.save();
          ctx.translate(x + w, y);
          ctx.scale(-1, 1);
          ctx.drawImage(node.sourceEl, 0, 0, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(node.sourceEl, x, y, w, h);
        }
      } catch {
        // drawImage can fail if video not ready
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Ask participants to show capture UI feedback.
    sendRoomEvent({ kind: "CAPTURED", dataUrl, capturedAt: Date.now() });

    // End session for everyone (slightly delayed so participants can render the notice).
    setTimeout(() => {
      safeJsonSend(wsRef.current, { type: "END_SESSION", payload: { reason: "captured" } });
    }, 350);
    onMasterCaptured?.(dataUrl);
  }, [clientId, getAspectForId, isMaster, onMasterCaptured, roomState.backgroundColor, roomState.backgroundImage, roomState.layout, sendRoomEvent]);

  const handleCapture = useCallback(async () => {
    if (!isMaster) return;
    if (isCapturing) return;
    if (typeof countdown === "number") return;

    if (timerSeconds > 0) {
      const startedAt = Date.now();
      sendRoomEvent({ kind: "COUNTDOWN_START", seconds: timerSeconds, startedAt });

      clearCountdownInterval();
      setIsCapturing(true);
      setCountdown(timerSeconds);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          const next = (typeof prev === "number" ? prev : timerSeconds) - 1;
          if (next <= 0) {
            clearCountdownInterval();
            Promise.resolve()
              .then(() => doCapture())
              .finally(() => {
                setCountdown(null);
                setIsCapturing(false);
              });
            return 0;
          }
          return next;
        });
      }, 1000);

      return;
    }

    setIsCapturing(true);
    try {
      await doCapture();
    } finally {
      setIsCapturing(false);
    }
  }, [clearCountdownInterval, countdown, doCapture, isCapturing, isMaster, sendRoomEvent, timerSeconds]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setStageSize({ w, h });
    };

    update();
    const t = window.setTimeout(update, 0);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      window.addEventListener("resize", update);
      return () => {
        window.clearTimeout(t);
        ro.disconnect();
        window.removeEventListener("resize", update);
      };
    }

    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, []);

  const ensureNormLayoutNow = useCallback(() => {
    const current = roomStateRef.current;
    if (!current) return null;
    if (current.layoutUnits === "norm") return current.layout || {};
    if (!stageSize.w || !stageSize.h) return null;

    const prev = current.layout || {};
    const migrated = {};
    for (const [id, rect] of Object.entries(prev)) {
      migrated[id] = clampNormRect(pxToNorm(rect, stageSize.w, stageSize.h));
      migrated[id].z = rect?.z ?? migrated[id].z ?? 0;
    }

    const nextState = {
      backgroundColor:
        current.backgroundColor ||
        (typeof current.background === "string" ? current.background : "#F4E6DA") ||
        "#F4E6DA",
      backgroundImage: current.backgroundImage || null,
      background:
        current.backgroundColor ||
        (typeof current.background === "string" ? current.background : "#F4E6DA") ||
        "#F4E6DA",
      layoutUnits: "norm",
      layout: migrated,
    };
    setRoomState(nextState);

    if (roleRef.current === "master") {
      safeJsonSend(wsRef.current, { type: "STATE_UPDATE", payload: { state: nextState } });
    }

    return migrated;
  }, [stageSize.h, stageSize.w]);

  // Migrate any legacy px layout into normalized layout once we know stage size.
  useEffect(() => {
    if (!stageSize.w || !stageSize.h) return;
    if (roomState.layoutUnits === "norm") return;

    const prev = roomState.layout || {};
    const migrated = {};
    for (const [id, rect] of Object.entries(prev)) {
      migrated[id] = clampNormRect(pxToNorm(rect, stageSize.w, stageSize.h));
      migrated[id].z = rect?.z ?? migrated[id].z ?? 0;
    }

    setRoomState((s) => ({ ...s, layoutUnits: "norm", layout: migrated }));
    if (roleRef.current === "master") {
      safeJsonSend(wsRef.current, {
        type: "STATE_UPDATE",
        payload: {
          state: {
            background: roomState.backgroundColor || roomState.background || "#F4E6DA",
            backgroundColor: roomState.backgroundColor || roomState.background || "#F4E6DA",
            backgroundImage: roomState.backgroundImage || null,
            layoutUnits: "norm",
            layout: migrated,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.w, stageSize.h]);

  // Ensure master assigns default normalized layout for everyone so all clients render identically.
  useEffect(() => {
    applyAutoLayoutIfNeeded();
  }, [applyAutoLayoutIfNeeded]);

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

        // Try to get local camera/mic, but don't block room join if it fails.
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
            // eslint-disable-next-line no-console
            console.log("[friends] WELCOME", {
              clientId: payload?.clientId,
              role: payload?.role,
              peers: payload?.peers,
            });

            // IMPORTANT: set refs immediately so setupPeer can run in the same tick
            // React state updates won't be reflected until after this handler returns.
            clientIdRef.current = payload.clientId;
            roleRef.current = payload.role;

            setClientId(payload.clientId);
            setRole(payload.role);
            setRoomState(normalizeIncomingState(payload.state));
            setStatus("connected");

            const initialPeers = Array.isArray(payload.peers) ? payload.peers : [];
            setPeers(initialPeers);
            // Set up connections to existing peers (offer side chosen deterministically)
            for (const peerId of initialPeers) {
              await setupPeer(peerId, { initiate: undefined });
            }
            return;
          }

          if (type === "PEER_JOINED") {
            const peerId = payload?.clientId;
            if (!peerId) return;

            // eslint-disable-next-line no-console
            console.log("[friends] PEER_JOINED", peerId);

            setPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
            // Set up connection to new peer (offer side chosen deterministically)
            await setupPeer(peerId, { initiate: undefined });
            if (payload?.state) setRoomState(normalizeIncomingState(payload.state));
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

            const pipe = segmentationPipelinesRef.current.get(peerId);
            if (pipe) {
              pipe.stopped = true;
              try {
                if (pipe.rafId) cancelAnimationFrame(pipe.rafId);
              } catch {
                // ignore
              }
              try {
                pipe.seg?.close?.();
              } catch {
                // ignore
              }
              segmentationPipelinesRef.current.delete(peerId);
            }
            tileVideoElsRef.current.delete(peerId);
            tileCanvasElsRef.current.delete(peerId);

              // Ensure UI falls back cleanly.
              setSegStatus(peerId, "failed");
            return;
          }

          if (type === "SIGNAL") {
            await handleSignal(payload?.from, payload?.data);
            return;
          }

          if (type === "STATE") {
            if (payload?.state) setRoomState(normalizeIncomingState(payload.state));
            return;
          }

          if (type === "ROOM_EVENT") {
            const kind = payload?.kind;
            if (kind === "COUNTDOWN_START") {
              if (roleRef.current === "participant") {
                const seconds = Math.max(0, Number(payload?.seconds) || 0);
                const startedAt = Number(payload?.startedAt) || Date.now();
                const endAt = startedAt + seconds * 1000;

                clearCountdownInterval();
                setIsCapturing(true);
                const tick = () => {
                  const remaining = Math.ceil((endAt - Date.now()) / 1000);
                  if (remaining <= 0) {
                    setCountdown(null);
                    setIsCapturing(false);
                    clearCountdownInterval();
                    return;
                  }
                  setCountdown(remaining);
                };

                tick();
                countdownIntervalRef.current = setInterval(tick, 250);
              }
              return;
            }
            if (kind === "CAPTURED") {
              if (roleRef.current === "participant") {
                showParticipantCaptureNotice({ dataUrl: payload?.dataUrl });
              }
              return;
            }
            return;
          }

          if (type === "SESSION_ENDED") {
            const reason = payload?.reason || "ended";
            if (roleRef.current === "participant" && reason === "captured") {
              // Give participants a moment to see the capture notice.
              setTimeout(() => {
                if (!mounted) return;
                setStatus("ended");
                onSessionEnded?.(reason);
                disconnect();
              }, 900);
              return;
            }

            setStatus("ended");
            onSessionEnded?.(reason);
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
      clearParticipantUiTimer();
      clearCountdownInterval();
      disconnect();
    };
  }, [clearCountdownInterval, clearParticipantUiTimer, disconnect, ensureLocalMedia, handleSignal, onSessionEnded, roomId, showParticipantCaptureNotice, updateRemoteStreamsState, wsUrl, setupPeer]);

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
    width: "100%",
    // Keep desktop boundary close to mobile to avoid off-screen tiles on small devices.
    maxWidth: "420px",
    margin: "0 auto",
    // On mobile, a strict 16:9 box becomes too short and clips 220px tiles.
    // Use a viewport-based height with a sensible minimum.
    height: "min(60vh, 520px)",
    minHeight: "320px",
    backgroundColor: roomState.backgroundColor || "#F4E6DA",
    backgroundImage: roomState.backgroundImage ? `url(${roomState.backgroundImage})` : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
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
                  value={roomState.backgroundColor || "#F4E6DA"}
                  onChange={(e) =>
                    sendStateUpdate({
                      backgroundColor: e.target.value,
                      // allow reverting from image background by changing the color
                      backgroundImage: null,
                    })
                  }
                  style={{ width: "30px", height: "22px", border: "none" }}
                />
              </label>

              <input
                ref={backgroundFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackgroundFileChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={() => backgroundFileInputRef.current?.click?.()}
                style={{
                  padding: "0.55rem 0.9rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(15,23,42,0.14)",
                  background: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Upload Background
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        style={stageStyle}
        onMouseDown={() => setSelectedTileId(null)}
        onPointerDown={() => kickstartPlayback()}
        onTouchStart={() => kickstartPlayback()}
      >
        {typeof countdown === "number" && countdown > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                minWidth: "92px",
                minHeight: "92px",
                padding: "18px",
                borderRadius: "999px",
                background: "rgba(15,23,42,0.55)",
                color: "#fff",
                fontWeight: 900,
                fontSize: "72px",
                lineHeight: 1,
                textAlign: "center",
                boxShadow: "0 22px 44px rgba(15,23,42,0.28)",
                backdropFilter: "blur(10px)",
              }}
            >
              {countdown}
            </div>
          </div>
        )}

        {role === "participant" && showParticipantCapture && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "18px",
                width: "min(380px, 100%)",
                padding: "1rem",
                textAlign: "center",
                boxShadow: "0 22px 44px rgba(0,0,0,0.28)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "18px" }}>📸 Foto berhasil diambil!</div>
              {participantCaptureUrl && (
                <img
                  src={participantCaptureUrl}
                  alt="capture preview"
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    marginTop: "0.75rem",
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              )}
            </div>
          </div>
        )}

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
          const isLegacyPx = roomState.layoutUnits !== "norm";
          const normLayout = isLegacyPx
            ? null
            : roomState.layout?.[id] || getDefaultTileNorm(stageSize.w, stageSize.h);

          const layout = isLegacyPx
            ? roomState.layout?.[id] || { ...DEFAULT_TILE_PX }
            : normToPx(normLayout, stageSize.w, stageSize.h);

          const isLocal = kind === "local";
          const canControl = isMaster;

          const segStatus = segmentationStatus?.[id];
          const showCutout = segStatus === "ready";

          const zIndex = layout.z ?? 0;

          const aspect = aspectById?.[id] || null;
          let displayW = layout.w;
          let displayH = layout.h;
          if (Number.isFinite(aspect) && aspect > 0.05 && aspect < 20) {
            const hFromW = displayW / aspect;
            const wFromH = displayH * aspect;
            if (Number.isFinite(hFromW) && Number.isFinite(wFromH)) {
              if (Math.abs(hFromW - displayH) <= Math.abs(wFromH - displayW)) {
                displayH = hFromW;
              } else {
                displayW = wFromH;
              }
            }
          }
          displayW = Math.max(20, Math.round(displayW));
          displayH = Math.max(20, Math.round(displayH));

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
              size={{ width: displayW, height: displayH }}
              position={{ x: layout.x, y: layout.y }}
              disableDragging={!canControl || pinchingTileId === id}
              enableResizing={canControl && pinchingTileId !== id}
              lockAspectRatio={canControl && Number.isFinite(aspect) ? aspect : false}
              style={{ zIndex, borderRadius: 14, overflow: "hidden", touchAction: canControl ? "none" : "manipulation" }}
              onDragStop={(e, d) => {
                if (!isMaster) return;
                userAdjustedLayoutRef.current = true;
                if (!stageSize.w || !stageSize.h) return;
                const baseLayout = ensureNormLayoutNow();
                if (!baseLayout) return;
                const currentNorm =
                  baseLayout?.[id] || getDefaultTileNorm(stageSize.w, stageSize.h);
                const nextNorm = clampNormRect({
                  ...currentNorm,
                  x: (Number.isFinite(d?.x) ? d.x : 0) / stageSize.w,
                  y: (Number.isFinite(d?.y) ? d.y : 0) / stageSize.h,
                });
                upsertLayoutFor(id, nextNorm);
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                if (!isMaster) return;
                userAdjustedLayoutRef.current = true;
                if (!stageSize.w || !stageSize.h) return;
                const baseLayout = ensureNormLayoutNow();
                if (!baseLayout) return;
                const w = Number.isFinite(ref?.offsetWidth) ? ref.offsetWidth : displayW;
                const h = Number.isFinite(ref?.offsetHeight) ? ref.offsetHeight : displayH;
                const currentNorm =
                  baseLayout?.[id] || getDefaultTileNorm(stageSize.w, stageSize.h);
                const nextNorm = clampNormRect({
                  ...currentNorm,
                  w: w / stageSize.w,
                  h: h / stageSize.h,
                  x: (Number.isFinite(position?.x) ? position.x : 0) / stageSize.w,
                  y: (Number.isFinite(position?.y) ? position.y : 0) / stageSize.h,
                });
                upsertLayoutFor(id, nextNorm);
              }}
              onMouseDown={(e) => {
                try {
                  e?.stopPropagation?.();
                } catch {
                  // ignore
                }

                setSelectedTileId(id);

                if (!isMaster) return;
                const baseLayout = ensureNormLayoutNow();
                if (!baseLayout) return;
                // Bring to front
                const maxZ = Math.max(
                  0,
                  ...Object.values(roomState.layout || {}).map((l) => l?.z ?? 0)
                );
                const currentNorm =
                  baseLayout?.[id] || getDefaultTileNorm(stageSize.w, stageSize.h);
                upsertLayoutFor(id, { ...currentNorm, z: maxZ + 1 });
              }}
            >
              <div
                ref={(el) => bindTileTouchSurface(id, el)}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  position: "relative",
                  touchAction: canControl ? "none" : "manipulation",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 14,
                    border:
                      selectedTileId === id
                        ? "2px solid rgba(15,23,42,0.28)"
                        : "2px solid transparent",
                    pointerEvents: "none",
                    boxSizing: "border-box",
                    zIndex: 3,
                  }}
                />
                <canvas
                  data-peer={isLocal ? undefined : id}
                  ref={(el) => {
                    if (!el) return;
                    tileCanvasElsRef.current.set(id, el);
                    if (isLocal) localCutoutCanvasRef.current = el;
                    ensureSegmentationPipeline(id, isLocal);
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: showCutout ? 1 : 0,
                    transform: MIRROR_ALL_STREAMS ? "scaleX(-1)" : undefined,
                  }}
                />
                <video
                  data-peer={isLocal ? undefined : id}
                  autoPlay
                  playsInline
                  muted={isLocal}
                  onLoadedMetadata={(e) => {
                    try {
                      const vw = e.currentTarget.videoWidth;
                      const vh = e.currentTarget.videoHeight;
                      if (vw > 0 && vh > 0) upsertAspectForId(id, vw / vh);
                    } catch {
                      // ignore
                    }

                    // Safari can require an explicit play() call for WebRTC streams
                    try {
                      const p = e.currentTarget.play?.();
                      if (p && typeof p.catch === "function") p.catch(() => {});
                    } catch {
                      // ignore
                    }
                  }}
                  ref={(el) => {
                    if (!el) return;

                    tileVideoElsRef.current.set(id, el);

                    // Attach stream
                    try {
                      if (videoProps.srcObject && el.srcObject !== videoProps.srcObject) {
                        el.srcObject = videoProps.srcObject;
                        try {
                          const p = el.play?.();
                          if (p && typeof p.catch === "function") p.catch(() => {});
                        } catch {
                          // ignore
                        }
                      }
                    } catch {
                      // ignore
                    }

                    ensureSegmentationPipeline(id, isLocal);
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: showCutout ? 0 : 1,
                    pointerEvents: "none",
                    transform: MIRROR_ALL_STREAMS ? "scaleX(-1)" : undefined,
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

      {isMaster && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "0.9rem",
            gap: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTimerSeconds((prev) => {
                const idx = TIMER_STEPS.indexOf(prev);
                const next = TIMER_STEPS[(idx + 1) % TIMER_STEPS.length];
                return next;
              });
            }}
            disabled={isCapturing || typeof countdown === "number"}
            style={{
              padding: "0.7rem 1.05rem",
              borderRadius: "999px",
              border: "1px solid rgba(15,23,42,0.14)",
              background: "white",
              color: "#0F172A",
              fontWeight: 800,
              cursor: isCapturing || typeof countdown === "number" ? "not-allowed" : "pointer",
              opacity: isCapturing || typeof countdown === "number" ? 0.6 : 1,
            }}
          >
            {timerSeconds > 0 ? `⏱️ Timer: ${timerSeconds}s` : "⏱️ Timer: Off"}
          </button>

          <button
            type="button"
            onClick={handleCapture}
            disabled={isCapturing || typeof countdown === "number"}
            style={{
              padding: "0.7rem 1.25rem",
              borderRadius: "999px",
              border: "none",
              background: "#0F172A",
              color: "white",
              fontWeight: 800,
              cursor: isCapturing || typeof countdown === "number" ? "not-allowed" : "pointer",
              opacity: isCapturing || typeof countdown === "number" ? 0.7 : 1,
            }}
          >
            {typeof countdown === "number" ? `⏳ ${countdown}s` : isCapturing ? "⏳" : "Capture (master)"}
          </button>
        </div>
      )}

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
