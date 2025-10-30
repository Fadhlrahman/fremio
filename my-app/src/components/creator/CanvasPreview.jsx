import { memo, useMemo } from "react";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_ELEMENT_MIN,
  BACKGROUND_MIN_SHORT_SIDE,
} from "./canvasConstants.js";

const elementShadow = "0 18px 36px rgba(15, 23, 42, 0.14)";

const getElementStyle = (element, isSelected) => {
  switch (element.type) {
    case "text":
      return {
        fontFamily: element.data?.fontFamily,
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
    case "shape":
      return {
        background: element.data?.fill ?? "#f4d3c2",
        backgroundColor: element.data?.fill ?? "#f4d3c2",
        borderRadius: `${element.data?.borderRadius ?? 24}px`,
        border: element.data?.stroke
          ? `${element.data?.strokeWidth ?? 2}px solid ${element.data.stroke}`
          : "none",
      };
    case "upload":
    case "photo":
    case "background-photo":
      return {
        borderRadius: `${
          element.data?.borderRadius ??
          (element.type === "background-photo" ? 0 : 24)
        }px`,
        border: element.data?.stroke
          ? `${element.data?.strokeWidth ?? 4}px solid ${element.data.stroke}`
          : element.type === "background-photo"
          ? "none"
          : "6px solid rgba(255,255,255,0.9)",
        background: element.data?.fill ?? (element.type === "background-photo" ? "transparent" : "#dbeafe"),
        backgroundColor:
          element.data?.fill ?? (element.type === "background-photo" ? "transparent" : "#dbeafe"),
        backgroundImage: "none",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };
    default:
      return {};
  }
};
const ElementContent = ({ element, isSelected }) => {
  const style = {
    width: "100%",
    height: "100%",
    ...getElementStyle(element, isSelected),
  };

  if (element.type === "text") {
    return (
      <div style={style}>
        {element.data?.text ?? "Teks"}
      </div>
    );
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
      <div
        style={style}
        className="h-full w-full"
      >
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
  onSelect,
  onUpdate,
  onBringToFront,
}) {
  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1)),
    [elements]
  );

  const clampBackgroundPosition = (width, height, x, y) => {
    const minX = Math.min(0, CANVAS_WIDTH - width);
    const maxX = Math.max(0, CANVAS_WIDTH - width);
    const minY = Math.min(0, CANVAS_HEIGHT - height);
    const maxY = Math.max(0, CANVAS_HEIGHT - height);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  return (
    <motion.div
      id="creator-canvas"
      className="relative mx-auto overflow-hidden shadow-[0_42px_90px_rgba(58,38,32,0.28)]"
      style={{
        background: canvasBackground,
        border: "4px solid rgba(92, 62, 48, 0.65)",
        boxShadow:
          "0 42px 90px rgba(58,38,32,0.28), 0 0 0 2px rgba(255,255,255,0.18) inset",
        borderRadius: 0,
        width: `${CANVAS_WIDTH}px`,
        height: `${CANVAS_HEIGHT}px`,
        maxWidth: "70vw",
        maxHeight: "68vh",
        position: "relative",
        touchAction: "none",
        userSelect: "none",
      }}
      layout
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelect("background");
        }
      }}
      onWheel={(e) => {
        e.stopPropagation();
        e.preventDefault();
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
          : `border border-transparent transition-colors ${
              isSelected ? "border-rose-200" : ""
            }`;
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
        return (
          <Rnd
            key={element.id}
            size={{ width: element.width, height: element.height }}
            position={{ x: element.x, y: element.y }}
            bounds="parent"
            onDragStop={(_, data) => {
              if (isBackgroundPhoto) {
                const clamped = clampBackgroundPosition(
                  element.width,
                  element.height,
                  data.x,
                  data.y
                );
                onUpdate(element.id, clamped);
                return;
              }
              onUpdate(element.id, { x: data.x, y: data.y });
            }}
            onResizeStop={(_, __, ref, delta, position) =>
              onUpdate(element.id, (() => {
                const nextWidth = parseFloat(ref.style.width);
                const nextHeight = parseFloat(ref.style.height);
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
                  return {
                    width: adjustedWidth,
                    height: adjustedHeight,
                    ...clamped,
                  };
                }
                return {
                  width: nextWidth,
                  height: nextHeight,
                  x: position.x,
                  y: position.y,
                };
              })())
            }
            minWidth={isBackgroundPhoto ? backgroundMinWidth : DEFAULT_ELEMENT_MIN}
            minHeight={isBackgroundPhoto ? backgroundMinHeight : DEFAULT_ELEMENT_MIN}
            dragMomentum={false}
            lockAspectRatio={isBackgroundPhoto ? backgroundAspectRatio : false}
            style={{
              zIndex: element.zIndex,
              boxShadow: isBackgroundPhoto
                ? "none"
                : isSelected
                ? elementShadow
                : "0 12px 32px rgba(15,23,42,0.12)",
              position: "absolute",
              outline:
                isBackgroundPhoto && isSelected
                  ? "3px solid rgba(244,114,182,0.6)"
                  : "none",
              outlineOffset: 0,
            }}
            className={baseClassName}
            onMouseDown={(event) => {
              event.stopPropagation();
              if (!isBackgroundPhoto) {
                onBringToFront(element.id);
              }
              onSelect(element.id);
            }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(element.id);
            }}
          >
            <ElementContent element={element} isSelected={isSelected} />
          </Rnd>
        );
      })}
    </motion.div>
  );
}

const CanvasPreview = memo(CanvasPreviewComponent);
export default CanvasPreview;
