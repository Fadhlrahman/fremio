import { forwardRef, memo, useEffect, useMemo, useRef } from "react";
import { Rnd } from "react-rnd";
import { motion as Motion } from "framer-motion";
import trashIcon from "../../assets/create-icon/create-trash.png";
import duplicateIcon from "../../assets/create-icon/create-duplicate.png";
import lockIcon from "../../assets/create-icon/create-lock.png";
import unlockIcon from "../../assets/create-icon/create-unlock.png";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_ELEMENT_MIN,
  BACKGROUND_MIN_SHORT_SIDE,
} from "./canvasConstants.js";
const HOLD_THRESHOLD_MS = 350;
const formatRadius = (value, fallback) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return `${fallback}px`;
};

const getElementBorderRadius = (element) => {
  switch (element.type) {
    case "shape":
    case "photo":
    case "upload":
      return formatRadius(element.data?.borderRadius, 24);
    case "background-photo":
      return formatRadius(element.data?.borderRadius, 0);
    case "text":
      return "18px";
    default:
      return "0px";
  }
};
const DRAG_THRESHOLD_PX = 6;
const DEFAULT_RESIZE_CONFIG = {
  top: true,
  right: true,
  bottom: true,
  left: true,
  topRight: true,
  bottomRight: true,
  bottomLeft: true,
  topLeft: true,
};

const buildResizeHandleStyles = (scale) => {
  const safeScale = Math.max(scale, 0.24);
  const salemColor = "#f7a998";

  const dotSize = Math.min(Math.max(Math.round(16 / safeScale), 14), 28);
  const lineThickness = Math.min(Math.max(Math.round(8 / safeScale), 8), 14);
  const lineLength = Math.min(Math.max(Math.round(30 / safeScale), 28), 50);

  const sharedDot = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: `${Math.max(1, Math.round(1.5 / safeScale))}px solid ${salemColor}`,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    borderRadius: "50%",
    cursor: "pointer",
    opacity: 1,
    touchAction: "manipulation",
    pointerEvents: "auto",
    zIndex: 9999,
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };

  const sharedLine = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: "none",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    borderRadius: `${lineThickness}px`,
    cursor: "pointer",
    opacity: 1,
    touchAction: "manipulation",
    pointerEvents: "auto",
    zIndex: 9999,
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };

  return {
    top: {
      ...sharedLine,
      width: `${lineLength}px`,
      height: `${lineThickness}px`,
      left: "50%",
      top: 0,
      transform: "translate(-50%, -50%)",
      cursor: "ns-resize",
    },
    bottom: {
      ...sharedLine,
      width: `${lineLength}px`,
      height: `${lineThickness}px`,
      left: "50%",
      bottom: 0,
      transform: "translate(-50%, 50%)",
      cursor: "ns-resize",
    },
    left: {
      ...sharedLine,
      width: `${lineThickness}px`,
      height: `${lineLength}px`,
      top: "50%",
      left: 0,
      transform: "translate(-50%, -50%)",
      cursor: "ew-resize",
    },
    right: {
      ...sharedLine,
      width: `${lineThickness}px`,
      height: `${lineLength}px`,
      top: "50%",
      right: 0,
      transform: "translate(50%, -50%)",
      cursor: "ew-resize",
    },
    topLeft: {
      ...sharedDot,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      top: 0,
      left: 0,
      transform: "translate(-50%, -50%)",
      cursor: "nwse-resize",
    },
    topRight: {
      ...sharedDot,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      top: 0,
      right: 0,
      transform: "translate(50%, -50%)",
      cursor: "nesw-resize",
    },
    bottomRight: {
      ...sharedDot,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      bottom: 0,
      right: 0,
      transform: "translate(50%, 50%)",
      cursor: "nwse-resize",
    },
    bottomLeft: {
      ...sharedDot,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      bottom: 0,
      left: 0,
      transform: "translate(-50%, 50%)",
      cursor: "nesw-resize",
    },
  };
};

const getElementStyle = (element, isSelected) => {
  switch (element.type) {
    case "text":
      return {
        fontFamily: element.data?.fontFamily ?? 'Inter',
        fontSize: `${element.data?.fontSize ?? 24}px`,
        color: element.data?.color ?? "#111827",
        fontWeight: element.data?.fontWeight ?? 500,
        textAlign: element.data?.align ?? "left",
        whiteSpace: "pre-wrap",
        lineHeight: 1.25,
        display: "flex",
        alignItems: "center",
        justifyContent:
          element.data?.align === "left"
            ? "flex-start"
            : element.data?.align === "right"
            ? "flex-end"
            : "center",
        padding: "12px 18px",
        borderRadius: "18px",
        backgroundColor: isSelected ? "rgba(255,255,255,0.65)" : "transparent",
      };
    case "shape": {
      const strokeWidth = Number(element.data?.strokeWidth ?? 0);
      const hasStroke = Boolean(element.data?.stroke) && strokeWidth > 0;
      return {
        background: element.data?.fill ?? "#f4d3c2",
        backgroundColor: element.data?.fill ?? "#f4d3c2",
        borderRadius: `${element.data?.borderRadius ?? 24}px`,
        border: hasStroke ? `${strokeWidth}px solid ${element.data.stroke}` : "none",
      };
    }
    case "upload":
    case "photo":
    case "background-photo": {
      const strokeWidth = Number(element.data?.strokeWidth ?? 0);
      const hasStroke = Boolean(element.data?.stroke) && strokeWidth > 0;
      const baseRadius =
        element.data?.borderRadius ??
        (element.type === "background-photo" ? 0 : 24);
      
      // Use transparent background if image exists for upload, otherwise use placeholder color
      const hasImage = element.data?.image;
      const baseBackground =
        element.type === "background-photo"
          ? element.data?.fill ?? "transparent"
          : hasImage 
            ? "transparent"
            : element.data?.fill ?? "#dbeafe";

      return {
        borderRadius: `${baseRadius}px`,
        border: hasStroke ? `${strokeWidth}px solid ${element.data.stroke}` : "none",
        background: baseBackground,
        backgroundColor: baseBackground,
        backgroundImage: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
    }
    default:
      return {};
  }
};

const createInteractionState = () => ({
  pointerActive: false,
  hadDrag: false,
  didTriggerTap: false,
  hadHold: false,
  holdTimer: null,
  totalDistance: 0,
  startX: null,
  startY: null,
  rndRef: null,
  isDragging: false,
  isResizing: false,
  dragStartClientX: null,
  dragStartClientY: null,
  dragStartElementX: null,
  dragStartElementY: null,
  isPinching: false,
  pinchStartDistance: null,
  pinchStartWidth: null,
  pinchStartHeight: null,
  pinchStartX: null,
  pinchStartY: null,
});

const resetRndPosition = (meta) => {
  if (!meta?.rndRef) {
    return;
  }
  const nextX = typeof meta.startX === "number" ? meta.startX : null;
  const nextY = typeof meta.startY === "number" ? meta.startY : null;
  if (nextX === null || nextY === null) {
    return;
  }
  if (typeof meta.rndRef.updatePosition === "function") {
    meta.rndRef.updatePosition({ x: nextX, y: nextY });
  }
};

const ElementContent = forwardRef(({ element, isSelected, elements }, ref) => {
  const style = {
    width: "100%",
    height: "100%",
    ...getElementStyle(element, isSelected),
  };

  if (element.type === "text") {
    return <div style={style}>{element.data?.text ?? "Teks"}</div>;
  }

  if (element.type === "shape") {
    return <div style={style} />;
  }

  if (element.type === "upload") {
    return (
      <div style={style}>
        {element.data?.image ? (
          <img
            src={element.data.image}
            alt="Unggahan"
            className="h-full w-full object-cover"
            style={{ 
              objectFit: element.data?.objectFit ?? "cover",
              pointerEvents: "none",
            }}
            draggable={false}
          />
        ) : (
          <div className="text-xs font-medium uppercase tracking-widest text-slate-600">
            {element.data?.label ?? "Unggahan"}
          </div>
        )}
      </div>
    );
  }

  if (element.type === "background-photo") {
    return (
      <div style={style} ref={ref}>
        {element.data?.image ? (
          <img
            src={element.data.image}
            alt="Background"
            style={{ 
              width: "100%",
              height: "100%",
              objectFit: "fill", // Fill to preserve entire image without cropping
              pointerEvents: "none",
              display: "block",
            }}
            draggable={false}
          />
        ) : (
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {element.data?.label ?? "Background"}
          </div>
        )}
      </div>
    );
  }

  if (element.type === "photo") {
    // Photo area creates a transparent "hole" in the canvas
    // This area will be completely transparent, cutting through background
    return (
      <div 
        style={{
          ...style,
          background: 'transparent',
          backgroundColor: 'transparent',
          position: 'relative',
          overflow: 'hidden',
        }} 
        className="h-full w-full creator-transparent-area"
        data-transparent-hole="true"
      >
        {/* Checkerboard pattern to visualize transparency in edit mode */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            pointerEvents: 'none',
          }}
        />
        
        {/* Visual indicator when selected */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center border-2 border-blue-400 bg-blue-400/10 pointer-events-none">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 text-center px-3 py-1.5 bg-white/90 rounded-md shadow-sm">
              Area Transparan
            </div>
          </div>
        )}
        
        {/* Subtle border when not selected */}
        {!isSelected && (
          <div className="absolute inset-0 border border-dashed border-slate-300/50 pointer-events-none" />
        )}
      </div>
    );
  }

  if (element.type === "transparent-area") {
    // Transparent area tool - makes background transparent in this area
    return (
      <div 
        style={{
          ...style,
          background: 'transparent',
          backgroundColor: 'transparent',
          position: 'relative',
          overflow: 'hidden',
        }} 
        className="h-full w-full creator-transparent-area"
        data-transparent-area="true"
      >
        {/* Checkerboard pattern to visualize transparency in edit mode */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(120, 120, 120, 0.1) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(120, 120, 120, 0.1) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(120, 120, 120, 0.1) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(120, 120, 120, 0.1) 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            pointerEvents: 'none',
          }}
        />
        
        {/* Visual indicator when selected */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center border-2 border-purple-500 bg-purple-500/10 pointer-events-none">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 text-center px-3 py-1.5 bg-white/95 rounded-md shadow-sm">
              Area Transparan
            </div>
          </div>
        )}
        
        {/* Subtle border when not selected */}
        {!isSelected && (
          <div className="absolute inset-0 border border-dashed border-purple-300/60 pointer-events-none" />
        )}
      </div>
    );
  }

  return <div className="h-full w-full rounded-lg bg-white/80" />;
});

function CanvasPreviewComponent({
  elements,
  selectedElementId,
  canvasBackground,
  aspectRatio = "9:16",
  previewConstraints = null,
  onSelect,
  onUpdate,
  onBringToFront,
  onRemove,
  onDuplicate,
  onToggleLock,
  onResizeUpload,
}) {
  const backgroundTouchRef = useRef(null);
  const interactionMetaRef = useRef(new Map());
  const backgroundInteractionRef = useRef(createInteractionState());

  const clearHoldTimer = (meta) => {
    if (meta?.holdTimer) {
      clearTimeout(meta.holdTimer);
      meta.holdTimer = null;
    }
  };

  const startHoldTimer = (meta) => {
    clearHoldTimer(meta);
    meta.hadHold = false;
    if (typeof window === "undefined") {
      return;
    }
    meta.holdTimer = window.setTimeout(() => {
      meta.hadHold = true;
      resetRndPosition(meta);
    }, HOLD_THRESHOLD_MS);
  };

  useEffect(() => {
      const elementIds = new Set(elements.map((element) => element.id));
      interactionMetaRef.current.forEach((meta, key) => {
        if (!elementIds.has(key)) {
          clearHoldTimer(meta);
          interactionMetaRef.current.delete(key);
        }
      });
  }, [elements]);

  useEffect(
    () => () => {
      interactionMetaRef.current.forEach((meta) => clearHoldTimer(meta));
      clearHoldTimer(backgroundInteractionRef.current);
    },
    []
  );

  const getInteractionMeta = (id) => {
    if (!interactionMetaRef.current.has(id)) {
      interactionMetaRef.current.set(id, createInteractionState());
    }
    return interactionMetaRef.current.get(id);
  };

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1)),
    [elements]
  );

  const canvasDimensions = useMemo(() => {
    const defaultDimensions = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

    if (typeof aspectRatio !== "string") {
      return defaultDimensions;
    }

    const [rawWidth, rawHeight] = aspectRatio.split(":").map(Number);
    const ratioWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : null;
    const ratioHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : null;

    if (!ratioWidth || !ratioHeight) {
      return defaultDimensions;
    }

    if (ratioHeight >= ratioWidth) {
      const height = Math.round((CANVAS_WIDTH * ratioHeight) / ratioWidth);
      return { width: CANVAS_WIDTH, height };
    }

    const width = Math.round((CANVAS_HEIGHT * ratioWidth) / ratioHeight);
    return { width, height: CANVAS_HEIGHT };
  }, [aspectRatio]);

  const { maxWidth, maxHeight } = useMemo(() => {
    if (!previewConstraints) {
      return {
        maxWidth: canvasDimensions.width,
        maxHeight: canvasDimensions.height,
      };
    }

    return {
      maxWidth: previewConstraints.maxWidth ?? canvasDimensions.width,
      maxHeight: previewConstraints.maxHeight ?? canvasDimensions.height,
    };
  }, [previewConstraints, canvasDimensions.width, canvasDimensions.height]);

  const previewScale = useMemo(() => {
    const scaleX = maxWidth / canvasDimensions.width;
    const scaleY = maxHeight / canvasDimensions.height;
    return Math.min(scaleX, scaleY, 1);
  }, [maxWidth, maxHeight, canvasDimensions.width, canvasDimensions.height]);

  const scaledSize = useMemo(
    () => ({
      width: canvasDimensions.width * previewScale,
      height: canvasDimensions.height * previewScale,
    }),
    [canvasDimensions.width, canvasDimensions.height, previewScale]
  );

  const clampBackgroundPosition = (width, height, x, y) => {
    // Background photo must always COVER the entire canvas
    // This means photo edges must be at or beyond canvas edges
    
    // For X axis:
    // - If photo wider than canvas: can shift left (negative x) or stay at 0
    // - Photo's left edge can be at most at x=0 (aligned with canvas left)
    // - Photo's right edge must be at least at canvasWidth (x + width >= canvasWidth)
    //   → x >= canvasWidth - width
    
    let minX, maxX;
    if (width >= canvasDimensions.width) {
      // Photo is wider than canvas
      minX = canvasDimensions.width - width;  // Can shift left (negative value)
      maxX = 0;                                // Can't shift right beyond 0
    } else {
      // Photo is narrower than canvas - center it (shouldn't happen with cover mode)
      minX = maxX = Math.round((canvasDimensions.width - width) / 2);
    }
    
    // For Y axis: same logic
    let minY, maxY;
    if (height >= canvasDimensions.height) {
      // Photo is taller than canvas
      minY = canvasDimensions.height - height; // Can shift up (negative value)
      maxY = 0;                                 // Can't shift down beyond 0
    } else {
      // Photo is shorter than canvas - center it (shouldn't happen with cover mode)
      minY = maxY = Math.round((canvasDimensions.height - height) / 2);
    }
    
    console.log('[clampBackgroundPosition]', {
      input: { width, height, x, y },
      canvas: { width: canvasDimensions.width, height: canvasDimensions.height },
      limits: { minX, maxX, minY, maxY }
    });
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  const backgroundMeta = backgroundInteractionRef.current;

  const handleBackgroundPointerDown = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    backgroundMeta.pointerActive = true;
    backgroundMeta.hadDrag = false;
    backgroundMeta.didTriggerTap = false;
    backgroundMeta.hadHold = false;
    startHoldTimer(backgroundMeta);
    onSelect("background", { interaction: "pointerdown" });
  };

  const handleBackgroundPointerUp = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (!backgroundMeta.pointerActive) {
      return;
    }
    backgroundMeta.pointerActive = false;
    clearHoldTimer(backgroundMeta);
    if (backgroundMeta.hadHold) {
      backgroundMeta.hadHold = false;
      return;
    }
    backgroundMeta.didTriggerTap = true;
    onSelect("background", { interaction: "tap" });
  };

  const handleBackgroundPointerCancel = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    backgroundMeta.pointerActive = false;
    backgroundMeta.hadDrag = false;
    backgroundMeta.didTriggerTap = false;
    backgroundMeta.hadHold = false;
    clearHoldTimer(backgroundMeta);
  };

  const handleBackgroundClick = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (backgroundMeta.didTriggerTap) {
      backgroundMeta.didTriggerTap = false;
      return;
    }
    onSelect("background", { interaction: "tap" });
  };

  // Add native touch event listeners for background photo
  // Ultra-smooth pinch-to-zoom using CSS transforms
  useEffect(() => {
    const backgroundElement = elements.find(el => el.type === 'background-photo');
    if (!backgroundElement || !backgroundElement.id) {
      return;
    }

    const meta = getInteractionMeta(backgroundElement.id);
    let gestureState = null;
    let cleanupFn = null;
    
    // Setup with a delay to ensure Rnd is mounted
    const timer = setTimeout(() => {
  const elementDom = backgroundTouchRef.current;
      if (!elementDom) {
        console.warn('❌ Background element DOM not found for touch listeners');
        return;
      }

      console.log('✅ Touch listeners attached to background photo');

      const handleTouchStart = (e) => {
        console.log('👆 Touch start:', e.touches.length, 'fingers');
        
        // Pinch: 2 fingers
        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();
          
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          
          const startDistance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
          );
          
          gestureState = {
            type: 'pinch',
            startDistance,
            startWidth: backgroundElement.width,
            startHeight: backgroundElement.height,
            startX: backgroundElement.x,
            startY: backgroundElement.y,
            currentScale: 1,
          };
          
          elementDom.style.willChange = 'transform';
          meta.pointerActive = false;
          meta.isDragging = false;
          
          console.log('🤏 Pinch started');
        }
        // Drag: 1 finger
        else if (e.touches.length === 1) {
          e.preventDefault();
          e.stopPropagation();
          
          const touch = e.touches[0];
          
          gestureState = {
            type: 'drag',
            startClientX: touch.clientX,
            startClientY: touch.clientY,
            startX: backgroundElement.x,
            startY: backgroundElement.y,
          };
          
          elementDom.style.willChange = 'transform';
          
          console.log('👉 Drag started');
        }
      };

      const handleTouchMove = (e) => {
        if (!gestureState) return;

        e.preventDefault();
        e.stopPropagation();

        // Pinch zoom
        if (gestureState.type === 'pinch' && e.touches.length === 2) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          
          const currentDistance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
          );

          const scale = currentDistance / gestureState.startDistance;
          gestureState.currentScale = scale;
          
          // Calculate pinch center NOW (realtime - this is the key!)
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          
          const canvasEl = document.getElementById('creator-canvas');
          if (!canvasEl) return;
          
          const canvasRect = canvasEl.getBoundingClientRect();
          const pinchCenterX = (centerX - canvasRect.left) / previewScale;
          const pinchCenterY = (centerY - canvasRect.top) / previewScale;
          
          // Calculate new dimensions
          const aspectRatio = backgroundElement.data?.imageAspectRatio || (gestureState.startWidth / gestureState.startHeight);
          const newWidth = gestureState.startWidth * scale;
          const newHeight = newWidth / aspectRatio;
          
          // Calculate where pinch center is INSIDE the ORIGINAL element (at start)
          const relativeX = (pinchCenterX - gestureState.startX) / gestureState.startWidth;
          const relativeY = (pinchCenterY - gestureState.startY) / gestureState.startHeight;
          
          // Keep pinch center at the same position
          const newX = pinchCenterX - (newWidth * relativeX);
          const newY = pinchCenterY - (newHeight * relativeY);
          
          // Store final values
          gestureState.finalWidth = newWidth;
          gestureState.finalHeight = newHeight;
          gestureState.finalX = newX;
          gestureState.finalY = newY;
          
          // Calculate transform
          const translateX = newX - gestureState.startX;
          const translateY = newY - gestureState.startY;
          
          // Apply CSS transform
          elementDom.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
          elementDom.style.transformOrigin = '0 0';
        }
        // Drag
        else if (gestureState.type === 'drag' && e.touches.length === 1) {
          const touch = e.touches[0];
          
          const deltaX = (touch.clientX - gestureState.startClientX) / previewScale;
          const deltaY = (touch.clientY - gestureState.startClientY) / previewScale;
          
          // Store final position
          gestureState.finalX = gestureState.startX + deltaX;
          gestureState.finalY = gestureState.startY + deltaY;
          
          // Apply CSS transform
          elementDom.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }
      };

      const handleTouchEnd = (e) => {
        if (!gestureState) return;
        
        console.log('✋ Touch end:', gestureState.type);
        
        // Use pre-calculated final values
        let finalUpdate = null;
        
        if (gestureState.type === 'pinch') {
          finalUpdate = {
            width: gestureState.finalWidth,
            height: gestureState.finalHeight,
            x: gestureState.finalX,
            y: gestureState.finalY,
          };
        } else if (gestureState.type === 'drag') {
          finalUpdate = {
            x: gestureState.finalX,
            y: gestureState.finalY,
          };
        }
        
        // Update state
        if (finalUpdate) {
          if (typeof finalUpdate.x === 'number' && typeof finalUpdate.y === 'number') {
            meta.startX = finalUpdate.x;
            meta.startY = finalUpdate.y;
            if (meta?.rndRef?.updatePosition) {
              meta.rndRef.updatePosition({ x: finalUpdate.x, y: finalUpdate.y });
            }
          }

          if (typeof finalUpdate.width === 'number' && typeof finalUpdate.height === 'number') {
            meta.startWidth = finalUpdate.width;
            meta.startHeight = finalUpdate.height;
            if (meta?.rndRef?.updateSize) {
              meta.rndRef.updateSize({ width: finalUpdate.width, height: finalUpdate.height });
            }
          }

          if (elementDom) {
            elementDom.style.transform = '';
            elementDom.style.transformOrigin = '';
            elementDom.style.willChange = '';
          }

          onUpdate(backgroundElement.id, finalUpdate);
        }
        
        gestureState = null;
        meta.pointerActive = false;
        meta.isDragging = false;
      };

      elementDom.addEventListener('touchstart', handleTouchStart, { passive: false });
      elementDom.addEventListener('touchmove', handleTouchMove, { passive: false });
      elementDom.addEventListener('touchend', handleTouchEnd, { passive: false });
      elementDom.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      // Store cleanup function
      cleanupFn = () => {
        elementDom.removeEventListener('touchstart', handleTouchStart);
        elementDom.removeEventListener('touchmove', handleTouchMove);
        elementDom.removeEventListener('touchend', handleTouchEnd);
        elementDom.removeEventListener('touchcancel', handleTouchEnd);
        console.log('🔴 Touch listeners removed');
      };
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [elements, previewScale, onUpdate, getInteractionMeta]);

  return (
    <div
      className="create-preview__canvas-wrapper"
      style={{
        width: `${scaledSize.width}px`,
        height: `${scaledSize.height}px`,
        position: "relative",
        overflow: "hidden",
      }}
    >
  <Motion.div
        key={`canvas-${aspectRatio}-${canvasDimensions.width}-${canvasDimensions.height}`}
        id="creator-canvas"
        className="relative mx-auto overflow-hidden shadow-[0_42px_90px_rgba(58,38,32,0.28)]"
        style={{
          background: canvasBackground,
          border: "4px solid rgba(92, 62, 48, 0.65)",
          boxShadow:
            "0 42px 90px rgba(58,38,32,0.28), 0 0 0 2px rgba(255,255,255,0.18) inset",
          borderRadius: 0,
          width: `${canvasDimensions.width}px`,
          height: `${canvasDimensions.height}px`,
          position: "absolute",
          top: "50%",
          left: "50%",
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          transform: `translate(-50%, -50%) scale(${previewScale})`,
          transformOrigin: "50% 50%",
        }}
        onPointerDown={handleBackgroundPointerDown}
        onTouchStart={handleBackgroundPointerDown}
        onPointerUp={handleBackgroundPointerUp}
        onTouchEnd={handleBackgroundPointerUp}
        onPointerCancel={handleBackgroundPointerCancel}
        onTouchCancel={handleBackgroundPointerCancel}
        onClick={handleBackgroundClick}
        onWheel={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        {sortedElements.map((element) => {
          const isSelected = selectedElementId === element.id;
          const isBackgroundPhoto = element.type === "background-photo";
          const backgroundAspectRatio = isBackgroundPhoto
            ? Number(element.data?.imageAspectRatio) > 0
              ? Number(element.data?.imageAspectRatio)
              : element.width > 0 && element.height > 0
              ? element.width / element.height
              : 1
            : 1;
          const safeAspectRatio = backgroundAspectRatio > 0 ? backgroundAspectRatio : 1;
          
          // Check if upload element has aspect ratio
          const isUploadElement = element.type === 'upload';
          const uploadAspectRatio = isUploadElement && element.data?.imageAspectRatio 
            ? element.data.imageAspectRatio 
            : null;
          
          const baseClassName = isBackgroundPhoto
            ? "transition-colors"
            : "border border-transparent transition-colors";
          const elementClassName = [
            baseClassName,
            "creator-element",
            `creator-element--type-${element.type}`,
            isSelected ? "creator-element--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          
          // For background photo: calculate minimum size to COVER canvas
          // Image must always fill the entire canvas
          const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
          const backgroundMinWidth = isBackgroundPhoto
            ? safeAspectRatio > canvasAspectRatio
              ? Math.round(CANVAS_HEIGHT * safeAspectRatio) // wider image - height = canvas, width > canvas
              : CANVAS_WIDTH // taller/same image - width = canvas
            : DEFAULT_ELEMENT_MIN;
          const backgroundMinHeight = isBackgroundPhoto
            ? safeAspectRatio > canvasAspectRatio
              ? CANVAS_HEIGHT // wider image - height = canvas
              : Math.round(CANVAS_WIDTH / safeAspectRatio) // taller/same image - width = canvas, height > canvas
            : DEFAULT_ELEMENT_MIN;
          
          const meta = getInteractionMeta(element.id);
          const elementBorderRadius = getElementBorderRadius(element);

          const handlePointerDown = (event) => {
            // Debug logging
            if (isBackgroundPhoto && event.touches) {
              console.log('[Background Photo PointerDown]', {
                touchCount: event.touches.length,
                isBackgroundPhoto,
                eventType: event.type
              });
            }
            
            if (meta.pointerActive || meta.isResizing) {
              return;
            }
            
            const targetClassList = event.target?.classList;
            const isHandle = Boolean(
              targetClassList &&
              Array.from(targetClassList).some((className) =>
                className.includes("react-rnd-handle") || className.includes("creator-resize-wrapper")
              )
            );
            
            if (isHandle) {
              event.stopPropagation();
              return;
            }
            
            event.stopPropagation();
            
            // Background photo touch events handled by native listener
            // Skip React event handlers to avoid conflicts
            if (isBackgroundPhoto && event.touches) {
              return;
            }
            
            const clientX = event.touches?.[0]?.clientX ?? event.clientX;
            const clientY = event.touches?.[0]?.clientY ?? event.clientY;
            
            meta.pointerActive = true;
            meta.hadDrag = false;
            meta.didTriggerTap = false;
            meta.hadHold = false;
            meta.totalDistance = 0;
            meta.startX = element.x;
            meta.startY = element.y;
            meta.isDragging = false;
            meta.isResizing = false;
            meta.dragStartClientX = clientX;
            meta.dragStartClientY = clientY;
            meta.dragStartElementX = element.x;
            meta.dragStartElementY = element.y;
            
            if (!isSelected) {
              if (!isBackgroundPhoto) {
                onBringToFront(element.id);
              }
              onSelect(element.id, { interaction: "pointerdown" });
              // Don't stop pointer tracking for background photo - allow drag immediately
              if (!isBackgroundPhoto) {
                meta.pointerActive = false;
                return;
              }
              // For background photo, continue to allow drag even on first click
            }
            
            startHoldTimer(meta);
            if (!isBackgroundPhoto) {
              onBringToFront(element.id);
            }
          };
          
          const handlePointerMove = (event) => {
            if (meta.isResizing || element.isLocked) {
              return;
            }
            
            // Background photo touch events handled by native listener
            if (isBackgroundPhoto && event.touches) {
              return;
            }
            
            if (!meta.pointerActive) {
              return;
            }
            
            // Allow drag for background photo even if not selected initially
            if (!isSelected && !isBackgroundPhoto) {
              return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            
            const clientX = event.touches?.[0]?.clientX ?? event.clientX;
            const clientY = event.touches?.[0]?.clientY ?? event.clientY;
            
            if (meta.dragStartClientX === null || meta.dragStartClientY === null) {
              return;
            }
            
            const deltaX = (clientX - meta.dragStartClientX) / previewScale;
            const deltaY = (clientY - meta.dragStartClientY) / previewScale;
            
            const totalDelta = Math.abs(deltaX) + Math.abs(deltaY);
            meta.totalDistance = totalDelta;
            
            if (!meta.hadDrag && totalDelta >= DRAG_THRESHOLD_PX) {
              meta.hadDrag = true;
              meta.didTriggerTap = false;
              meta.isDragging = true;
              clearHoldTimer(meta);
            }
            
            if (meta.isDragging) {
              const newX = meta.dragStartElementX + deltaX;
              const newY = meta.dragStartElementY + deltaY;
              
              if (isBackgroundPhoto) {
                // Background photo: completely free - can go anywhere
                onUpdate(element.id, { x: newX, y: newY });
              } else {
                // Regular elements: must stay within canvas bounds
                const clampedX = Math.max(0, Math.min(canvasDimensions.width - element.width, newX));
                const clampedY = Math.max(0, Math.min(canvasDimensions.height - element.height, newY));
                onUpdate(element.id, { x: clampedX, y: clampedY });
              }
            }
          };

          const handlePointerUp = (event) => {
            event.stopPropagation();
            clearHoldTimer(meta);
            
            // End pinch gesture
            if (meta.isPinching) {
              meta.isPinching = false;
              meta.pinchStartDistance = null;
              meta.pinchStartWidth = null;
              meta.pinchStartHeight = null;
              meta.pinchStartX = null;
              meta.pinchStartY = null;
              return;
            }
            
            if (!meta.pointerActive) {
              return;
            }
            
            if (meta.hadDrag || meta.isDragging) {
              meta.pointerActive = false;
              meta.hadDrag = false;
              meta.isDragging = false;
              meta.totalDistance = 0;
              meta.isResizing = false;
              return;
            }
            
            meta.pointerActive = false;
            
            if (meta.hadHold) {
              meta.hadHold = false;
              meta.totalDistance = 0;
              meta.isResizing = false;
              return;
            }
            
            meta.didTriggerTap = true;
            meta.totalDistance = 0;
            meta.isResizing = false;
          };

          const handlePointerCancel = (event) => {
            event.stopPropagation();
            meta.pointerActive = false;
            meta.hadDrag = false;
            meta.didTriggerTap = false;
            meta.hadHold = false;
            meta.totalDistance = 0;
            meta.isDragging = false;
            meta.isResizing = false;
            meta.isPinching = false;
            meta.pinchStartDistance = null;
            meta.pinchStartWidth = null;
            meta.pinchStartHeight = null;
            meta.pinchStartX = null;
            meta.pinchStartY = null;
            resetRndPosition(meta);
            clearHoldTimer(meta);
          };

          const handleClick = (event) => {
            event.stopPropagation();
            if (meta.didTriggerTap) {
              meta.didTriggerTap = false;
              return;
            }
            onSelect(element.id, { interaction: "tap" });
          };

          // Handle wheel event for background photo zoom (desktop)
          const handleWheel = (event) => {
            if (!isBackgroundPhoto || !isSelected) {
              return;
            }
            
            event.preventDefault();
            event.stopPropagation();
            
            const delta = -event.deltaY;
            // Increased zoom sensitivity for smoother feel
            const zoomFactor = delta > 0 ? 1.1 : 0.9;
            
            // Maintain aspect ratio - smooth calculation
            const aspectRatio = element.data?.imageAspectRatio || (element.width / element.height);
            const finalWidth = element.width * zoomFactor;
            const finalHeight = finalWidth / aspectRatio;
            
            // Get mouse position relative to canvas
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) / previewScale;
            const mouseY = (event.clientY - rect.top) / previewScale;
            
            // Calculate new position to zoom towards mouse
            const scaleChange = finalWidth / element.width;
            const newX = element.x - (mouseX - element.x) * (scaleChange - 1);
            const newY = element.y - (mouseY - element.y) * (scaleChange - 1);
            
            onUpdate(element.id, {
              width: finalWidth,
              height: finalHeight,
              x: newX,
              y: newY,
            });
          };

          const applyResizeUpdate = (ref, position) => {
            if (!ref) {
              return;
            }
            const nextWidth = parseFloat(ref.style.width);
            const nextHeight = parseFloat(ref.style.height);
            if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
              return;
            }

            // All elements update freely
            onUpdate(element.id, {
              width: nextWidth,
              height: nextHeight,
              x: position.x,
              y: position.y,
            });
          };

          return (
            <Rnd
              key={element.id}
              size={{ width: element.width, height: element.height }}
              position={{ x: element.x, y: element.y }}
              bounds="parent"
              scale={previewScale}
              enableResizing={isSelected && !isBackgroundPhoto ? DEFAULT_RESIZE_CONFIG : false}
              disableDragging={true}
              resizeHandleStyles={isSelected && !isBackgroundPhoto ? buildResizeHandleStyles(previewScale) : undefined}
              resizeHandleWrapperClassName="creator-resize-wrapper"
              resizeHandleComponent={{
                top: <div className="react-rnd-handle react-rnd-handle-top" />,
                right: <div className="react-rnd-handle react-rnd-handle-right" />,
                bottom: <div className="react-rnd-handle react-rnd-handle-bottom" />,
                left: <div className="react-rnd-handle react-rnd-handle-left" />,
                topRight: <div className="react-rnd-handle react-rnd-handle-topRight" />,
                bottomRight: <div className="react-rnd-handle react-rnd-handle-bottomRight" />,
                bottomLeft: <div className="react-rnd-handle react-rnd-handle-bottomLeft" />,
                topLeft: <div className="react-rnd-handle react-rnd-handle-topLeft" />,
              }}
              onResizeStart={(e) => {
                if (e?.nativeEvent) {
                  e.nativeEvent.stopPropagation();
                  e.nativeEvent.preventDefault();
                }
                e?.stopPropagation?.();
                e?.preventDefault?.();
                meta.isResizing = true;
                meta.pointerActive = false;
                meta.hadDrag = false;
                meta.isDragging = false;
                meta.hadHold = false;
                meta.didTriggerTap = false;
                clearHoldTimer(meta);
                if (!isSelected) {
                  onSelect(element.id, { interaction: "resize-start" });
                }
              }}
              onResize={(_, __, ref, ___, position) => {
                if (!meta.isResizing) {
                  return;
                }
                applyResizeUpdate(ref, position);
                // No real-time resize during drag - just visual feedback
              }}
              onDragStart={(event) => {
                if (meta.isResizing) {
                  if (event?.nativeEvent) {
                    event.nativeEvent.stopPropagation();
                    event.nativeEvent.preventDefault();
                  }
                  event?.stopPropagation?.();
                  event?.preventDefault?.();
                  return false;
                }
                meta.hadHold = false;
                meta.didTriggerTap = false;
                meta.isDragging = false;
                meta.hadDrag = false;
                meta.totalDistance = 0;
                clearHoldTimer(meta);
                if (typeof event?.stopPropagation === "function") {
                  event.stopPropagation();
                }
                onSelect(element.id, { interaction: "drag" });
              }}
              onDrag={(event, data) => {
                if (meta.isResizing) {
                  if (event?.nativeEvent) {
                    event.nativeEvent.stopPropagation();
                    event.nativeEvent.preventDefault();
                  }
                  event?.stopPropagation?.();
                  event?.preventDefault?.();
                  return false;
                }
                meta.totalDistance += Math.abs(data.deltaX) + Math.abs(data.deltaY);
                if (!meta.hadDrag && meta.totalDistance >= DRAG_THRESHOLD_PX) {
                  meta.hadDrag = true;
                  meta.didTriggerTap = false;
                  meta.isDragging = true;
                }
              }}
              onDragStop={(_, data) => {
                if (meta.isResizing) {
                  meta.pointerActive = false;
                  meta.hadDrag = false;
                  meta.didTriggerTap = false;
                  meta.hadHold = false;
                  meta.totalDistance = 0;
                  meta.isDragging = false;
                  return false;
                }
                const totalDelta =
                  Math.abs((meta.startX ?? data.x) - data.x) +
                  Math.abs((meta.startY ?? data.y) - data.y);
                const didDrag = meta.hadDrag || totalDelta >= 1;
                meta.pointerActive = false;
                meta.hadDrag = false;
                meta.didTriggerTap = false;
                meta.hadHold = false;
                meta.totalDistance = 0;
                meta.isDragging = false;
                meta.isResizing = false;
                clearHoldTimer(meta);
                if (!didDrag) {
                  resetRndPosition(meta);
                  return;
                }
                // All elements update freely - no clamp for background photo
                onUpdate(element.id, { x: data.x, y: data.y });
                meta.startX = data.x;
                meta.startY = data.y;
              }}
              onResizeStop={(_, __, ref, delta, position) => {
                if (!meta.isResizing) {
                  return;
                }
                
                applyResizeUpdate(ref, position);
                
                // Resize upload image from original for quality (only once when done)
                if (isUploadElement && onResizeUpload) {
                  const nextWidth = parseFloat(ref.style.width);
                  const nextHeight = parseFloat(ref.style.height);
                  if (Number.isFinite(nextWidth) && Number.isFinite(nextHeight)) {
                    onResizeUpload(element.id, nextWidth, nextHeight);
                  }
                }
                
                meta.isResizing = false;
                meta.pointerActive = false;
                meta.hadDrag = false;
                meta.isDragging = false;
              }}
              minWidth={DEFAULT_ELEMENT_MIN}
              minHeight={DEFAULT_ELEMENT_MIN}
              dragMomentum={false}
              lockAspectRatio={
                isBackgroundPhoto 
                  ? backgroundAspectRatio 
                  : uploadAspectRatio 
                    ? uploadAspectRatio 
                    : false
              }
              enableUserSelectHack={false}
              dragGrid={[1, 1]}
              resizeGrid={[1, 1]}
              style={{
                zIndex: element.zIndex,
                boxShadow: "none",
                position: "absolute",
                borderRadius: elementBorderRadius,
                backgroundColor: "transparent",
                touchAction: isBackgroundPhoto ? "none" : "auto",
              }}
              className={elementClassName}
              ref={(instance) => {
                meta.rndRef = instance;
              }}
              onPointerDown={isBackgroundPhoto ? undefined : handlePointerDown}
              onTouchStart={isBackgroundPhoto ? undefined : handlePointerDown}
              onPointerMove={isBackgroundPhoto ? undefined : handlePointerMove}
              onTouchMove={isBackgroundPhoto ? undefined : handlePointerMove}
              onPointerUp={isBackgroundPhoto ? undefined : handlePointerUp}
              onTouchEnd={isBackgroundPhoto ? undefined : handlePointerUp}
              onPointerCancel={isBackgroundPhoto ? undefined : handlePointerCancel}
              onTouchCancel={isBackgroundPhoto ? undefined : handlePointerCancel}
              onClick={isBackgroundPhoto ? undefined : handleClick}
              onWheel={handleWheel}
            >
              {isSelected && !isBackgroundPhoto && (
                <>
                  <div
                    data-export-ignore="true"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      border: "2px solid #f7a998",
                      borderRadius: 0,
                      pointerEvents: "none",
                      zIndex: -1,
                    }}
                  />
                  <div
                    data-export-ignore="true"
                    style={{
                      position: "absolute",
                      top: -60,
                      left: "50%",
                      transform: "translateX(-50%)",
                      display: "flex",
                      gap: "12px",
                      zIndex: 10000,
                      pointerEvents: "auto",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock?.(element.id);
                      }}
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "12px",
                        background: element.isLocked ? "linear-gradient(135deg, #f7a998 0%, #e89985 100%)" : "#ffffff",
                        border: element.isLocked ? "2px solid #f7a998" : "2px solid #f7a998",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: element.isLocked ? "0 4px 12px rgba(247, 169, 152, 0.4)" : "0 2px 8px rgba(0, 0, 0, 0.15)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img 
                        src={element.isLocked ? lockIcon : unlockIcon} 
                        alt={element.isLocked ? "Locked" : "Unlocked"} 
                        style={{ width: "28px", height: "28px" }} 
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate?.(element.id);
                      }}
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "12px",
                        background: "#ffffff",
                        border: "2px solid #f7a998",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img src={duplicateIcon} alt="Duplicate" style={{ width: "28px", height: "28px" }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.(element.id);
                      }}
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "12px",
                        background: "#ffffff",
                        border: "2px solid #f7a998",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img src={trashIcon} alt="Delete" style={{ width: "28px", height: "28px" }} />
                    </button>
                  </div>
                </>
              )}
              {isSelected && isBackgroundPhoto && (
                <div
                  data-export-ignore="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    border: "2px solid #f7a998",
                    borderRadius: 0,
                    pointerEvents: "none",
                    zIndex: -1,
                  }}
                />
              )}
              <ElementContent
                element={element}
                isSelected={isSelected}
                elements={elements}
                ref={isBackgroundPhoto ? backgroundTouchRef : null}
              />
            </Rnd>
          );
        })}
  </Motion.div>
    </div>
  );
}

export default memo(CanvasPreviewComponent);
