import { memo, useMemo } from "react";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";

const elementShadow = "0 18px 36px rgba(15, 23, 42, 0.14)";
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 640;

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
        borderRadius: `${element.data?.borderRadius ?? 24}px`,
        border: element.data?.stroke
          ? `${element.data?.strokeWidth ?? 2}px solid ${element.data.stroke}`
          : "none",
      };
    case "upload":
    case "photo":
      return {
        borderRadius: `${element.data?.borderRadius ?? 24}px`,
        border: element.data?.stroke
          ? `${element.data?.strokeWidth ?? 4}px solid ${element.data.stroke}`
          : "6px solid rgba(255,255,255,0.9)",
        background: element.data?.fill ?? "#dbeafe",
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
  const style = getElementStyle(element, isSelected);

  if (element.type === "text") {
    return (
      <div style={style} className="h-full w-full">
        {element.data?.text ?? "Teks"}
      </div>
    );
  }

  if (element.type === "shape") {
    return <div style={style} className="h-full w-full" />;
  }

  if (element.type === "upload") {
    return (
      <div style={style} className="h-full w-full">
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

  if (element.type === "photo") {
    return (
      <div
        style={style}
        className="h-full w-full bg-gradient-to-br from-sky-100 to-sky-200"
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

  return (
    <motion.div
      id="creator-canvas"
      className="relative mx-auto overflow-hidden border border-white/70 shadow-[0_30px_70px_rgba(15,23,42,0.14)]"
      style={{
        background: canvasBackground,
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
        return (
          <Rnd
            key={element.id}
            size={{ width: element.width, height: element.height }}
            position={{ x: element.x, y: element.y }}
            bounds="parent"
            onDragStop={(_, data) =>
              onUpdate(element.id, { x: data.x, y: data.y })
            }
            onResizeStop={(_, __, ref, delta, position) =>
              onUpdate(element.id, {
                width: parseFloat(ref.style.width),
                height: parseFloat(ref.style.height),
                x: position.x,
                y: position.y,
              })
            }
            minWidth={60}
            minHeight={60}
            dragMomentum={false}
            style={{
              zIndex: element.zIndex,
              boxShadow: isSelected
                ? elementShadow
                : "0 12px 32px rgba(15,23,42,0.12)",
              position: "absolute",
            }}
            className={`border border-transparent transition-colors ${
              isSelected ? "border-rose-200" : ""
            }`}
            onMouseDown={(event) => {
              event.stopPropagation();
              onBringToFront(element.id);
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
