import React from "react";

/**
 * FramePreview
 * @param {Object[]} photos - array of photo URLs/base64
 * @param {Object} frameConfig - loaded from JSON (slots, image, etc)
 */
export default function FramePreview({ photos, frameConfig }) {
  if (!frameConfig) return <div>Frame config not loaded</div>;
  return (
    <div className="relative w-full max-w-xs aspect-[3/4] mx-auto rounded-2xl overflow-hidden bg-gray-100">
      {/* Frame Image */}
      <img
        src={frameConfig.image}
        alt={frameConfig.frameId}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        draggable={false}
      />
      {/* Foto di slot */}
      {frameConfig.slots.map((slot, i) => (
        <div
          key={i}
          className="absolute rounded-lg overflow-hidden"
          style={{
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            width: `${slot.w * 100}%`,
            height: `${slot.h * 100}%`,
            zIndex: 5,
            background: "#fff"
          }}
        >
          {photos[i] && (
            <img
              src={photos[i]}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center" }}
              draggable={false}
            />
          )}
        </div>
      ))}
    </div>
  );
}
