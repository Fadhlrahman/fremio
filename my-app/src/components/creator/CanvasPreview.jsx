import { memo, useEffect, useMemo, useRef } from "react";
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
      const baseBackground =
        element.type === "background-photo"
          ? element.data?.fill ?? "transparent"
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

const ElementContent = ({ element, isSelected }) => {
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
            style={{ objectFit: element.data?.objectFit ?? "cover" }}
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
      <div style={style}>
        {element.data?.image ? (
          <img
            src={element.data.image}
            alt="Background"
            className="h-full w-full object-cover"
            style={{ objectFit: element.data?.objectFit ?? "contain" }}
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
    return (
      <div style={style} className="h-full w-full">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {element.data?.label ?? "Foto Area"}
        </div>
      </div>
    );
  }

  return <div className="h-full w-full rounded-lg bg-white/80" />;
};

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
}) {
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
    const baseWidth = 480;
    let width = baseWidth;
    let height;

    switch (aspectRatio) {
      case "9:16":
        width = baseWidth;
        height = Math.round(baseWidth * (16 / 9));
        break;
      case "4:5":
        width = baseWidth;
        height = Math.round(baseWidth * (5 / 4));
        break;
      case "2:3":
        width = baseWidth;
        height = Math.round(baseWidth * (3 / 2));
        break;
      default:
        width = CANVAS_WIDTH;
        height = CANVAS_HEIGHT;
    }

    return { width, height };
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
    const minX = Math.min(0, canvasDimensions.width - width);
    const maxX = Math.max(0, canvasDimensions.width - width);
    const minY = Math.min(0, canvasDimensions.height - height);
    const maxY = Math.max(0, canvasDimensions.height - height);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
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

  return (
    <div
      className="create-preview__canvas-wrapper"
      style={{
        width: `${scaledSize.width}px`,
        height: `${scaledSize.height}px`,
        position: "relative",
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
          overflow: "visible",
          touchAction: "none",
          userSelect: "none",
          transform: `translate(-50%, -50%) scale(${previewScale})`,
          transformOrigin: "50% 50%",
        }}
        layout
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
          const backgroundMinWidth = isBackgroundPhoto
            ? Math.min(
                CANVAS_WIDTH,
                Math.max(
                  BACKGROUND_MIN_SHORT_SIDE,
                  Math.round(BACKGROUND_MIN_SHORT_SIDE * safeAspectRatio)
                )
              )
            : DEFAULT_ELEMENT_MIN;
          const backgroundMinHeight = isBackgroundPhoto
            ? Math.min(
                CANVAS_HEIGHT,
                Math.max(
                  BACKGROUND_MIN_SHORT_SIDE,
                  Math.round(BACKGROUND_MIN_SHORT_SIDE / safeAspectRatio)
                )
              )
            : DEFAULT_ELEMENT_MIN;
          const meta = getInteractionMeta(element.id);
          const elementBorderRadius = getElementBorderRadius(element);

          const handlePointerDown = (event) => {
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
              meta.pointerActive = false;
              return;
            }
            
            startHoldTimer(meta);
            if (!isBackgroundPhoto) {
              onBringToFront(element.id);
            }
          };
          
          const handlePointerMove = (event) => {
            if (!meta.pointerActive || meta.isResizing || !isSelected || element.isLocked) {
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
              
              const clampedX = Math.max(0, Math.min(canvasDimensions.width - element.width, newX));
              const clampedY = Math.max(0, Math.min(canvasDimensions.height - element.height, newY));
              
              if (isBackgroundPhoto) {
                const clamped = clampBackgroundPosition(
                  element.width,
                  element.height,
                  clampedX,
                  clampedY
                );
                onUpdate(element.id, clamped);
              } else {
                onUpdate(element.id, { x: clampedX, y: clampedY });
              }
            }
          };

          const handlePointerUp = (event) => {
            event.stopPropagation();
            clearHoldTimer(meta);
            
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

          const applyResizeUpdate = (ref, position) => {
            if (!ref) {
              return;
            }
            const nextWidth = parseFloat(ref.style.width);
            const nextHeight = parseFloat(ref.style.height);
            if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) {
              return;
            }

            if (isBackgroundPhoto) {
              let adjustedWidth = nextWidth;
              let adjustedHeight = nextHeight;

              if (adjustedWidth > CANVAS_WIDTH) {
                adjustedWidth = CANVAS_WIDTH;
                adjustedHeight = Math.round(adjustedWidth / safeAspectRatio);
              }

              if (adjustedHeight > CANVAS_HEIGHT) {
                adjustedHeight = CANVAS_HEIGHT;
                adjustedWidth = Math.round(adjustedHeight * safeAspectRatio);
              }

              const clamped = clampBackgroundPosition(
                adjustedWidth,
                adjustedHeight,
                position.x,
                position.y
              );

              onUpdate(element.id, {
                width: adjustedWidth,
                height: adjustedHeight,
                ...clamped,
              });
              return;
            }

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
              enableResizing={isSelected ? DEFAULT_RESIZE_CONFIG : false}
              disableDragging={true}
              resizeHandleStyles={isSelected ? buildResizeHandleStyles(previewScale) : undefined}
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
                if (isBackgroundPhoto) {
                  const clamped = clampBackgroundPosition(
                    element.width,
                    element.height,
                    data.x,
                    data.y
                  );
                  onUpdate(element.id, clamped);
                } else {
                  onUpdate(element.id, { x: data.x, y: data.y });
                }
                meta.startX = data.x;
                meta.startY = data.y;
              }}
              onResizeStop={(_, __, ref, delta, position) => {
                if (!meta.isResizing) {
                  return;
                }
                applyResizeUpdate(ref, position);
                meta.isResizing = false;
                meta.pointerActive = false;
                meta.hadDrag = false;
                meta.isDragging = false;
              }}
              minWidth={isBackgroundPhoto ? backgroundMinWidth : DEFAULT_ELEMENT_MIN}
              minHeight={isBackgroundPhoto ? backgroundMinHeight : DEFAULT_ELEMENT_MIN}
              dragMomentum={false}
              lockAspectRatio={isBackgroundPhoto ? backgroundAspectRatio : false}
              enableUserSelectHack={false}
              dragGrid={[1, 1]}
              resizeGrid={[1, 1]}
              style={{
                zIndex: element.zIndex,
                boxShadow: "none",
                position: "absolute",
                borderRadius: elementBorderRadius,
                backgroundColor: "transparent",
              }}
              className={elementClassName}
              ref={(instance) => {
                meta.rndRef = instance;
              }}
              onPointerDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              onPointerMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchEnd={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onTouchCancel={handlePointerCancel}
              onClick={handleClick}
            >
              {isSelected && !isBackgroundPhoto && (
                <>
                  <div
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
              <ElementContent element={element} isSelected={isSelected} />
            </Rnd>
          );
        })}
  </Motion.div>
    </div>
  );
}

export default memo(CanvasPreviewComponent);
