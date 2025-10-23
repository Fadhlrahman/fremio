import React, { useRef, useState } from "react";
import "../styles/FrameBuilder.css";

export default function FrameBuilder() {
  const [frameImg, setFrameImg] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dragSlot, setDragSlot] = useState(null);
  const canvasRef = useRef();
  const fileInputRef = useRef();

  // Handle frame image upload
  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFrameImg(url);
  };

  // Trigger file input click
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Add new slot (rectangle)
  const addSlot = () => {
    setSlots([
      ...slots,
      {
        x: 100,
        y: 100,
        width: 200,
        height: 250,
        shape: "rect",
        id: Date.now(),
      },
    ]);
  };

  // Delete slot
  const deleteSlot = (idx) => {
    setSlots(slots.filter((_, i) => i !== idx));
  };

  // Drag & resize logic
  const handleMouseDown = (e, idx) => {
    setDragSlot({
      idx,
      offsetX: e.nativeEvent.offsetX - slots[idx].x,
      offsetY: e.nativeEvent.offsetY - slots[idx].y,
    });
  };
  const handleMouseMove = (e) => {
    if (!dragSlot) return;
    const { idx, offsetX, offsetY } = dragSlot;
    const newSlots = [...slots];
    newSlots[idx].x = e.nativeEvent.offsetX - offsetX;
    newSlots[idx].y = e.nativeEvent.offsetY - offsetY;
    setSlots(newSlots);
  };
  const handleMouseUp = () => setDragSlot(null);

  // Export JSON config
  const exportConfig = () => {
    const config = {
      frame_id: "custom_frame",
      canvas_size: { width: 1080, height: 1620 },
      slots: slots.map(({ x, y, width, height, shape, id }) => ({
        id,
        shape,
        x,
        y,
        width,
        height,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert("✅ Config berhasil di-copy ke clipboard!");
  };

  return (
    <div className="frame-builder-wrapper">
      <div className="container frame-builder-container">
        {/* Header */}
        <div className="frame-builder-header">
          <div>
            <h1 className="frame-builder-title">Fremio Creator</h1>
            <p className="frame-builder-subtitle">Susun frame sesuai gayamu</p>
          </div>
        </div>

        {/* Main Layout */}
        <div className="frame-builder-layout">
          {/* Hidden file input - outside grid */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFrameUpload}
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              pointerEvents: "none",
            }}
          />

          {/* Left Panel - Tools */}
          <div className="frame-builder-panel tools-panel">
            <h3 className="panel-title">Tools</h3>
            <div className="tools-grid">
              <button className="tool-button" onClick={triggerFileUpload}>
                <span className="tool-icon">🖼️</span>
                <span className="tool-label">Background</span>
              </button>

              <button className="tool-button" onClick={addSlot}>
                <span className="tool-icon">📐</span>
                <span className="tool-label">Area Foto</span>
              </button>

              <button className="tool-button">
                <span className="tool-icon">T</span>
                <span className="tool-label">Add Text</span>
              </button>

              <button className="tool-button">
                <span className="tool-icon">⭕</span>
                <span className="tool-label">Shape</span>
              </button>

              <button className="tool-button">
                <span className="tool-icon">💾</span>
                <span className="tool-label">Unggahan</span>
              </button>

              <button className="tool-button" onClick={exportConfig}>
                <span className="tool-icon">�</span>
                <span className="tool-label">Save Template</span>
              </button>
            </div>
          </div>

          {/* Center - Preview Canvas */}
          <div className="frame-builder-preview">
            <h3 className="panel-title">Preview</h3>
            <div className="canvas-wrapper">
              <div
                className="canvas-container"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={810}
                  className="canvas-base"
                />
                {frameImg && (
                  <img
                    src={frameImg}
                    alt="Frame"
                    className="canvas-frame-image"
                  />
                )}
                {slots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="canvas-slot"
                    style={{
                      left: slot.x,
                      top: slot.y,
                      width: slot.width,
                      height: slot.height,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, idx)}
                  >
                    <button
                      className="slot-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlot(idx);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="frame-builder-panel properties-panel">
            <h3 className="panel-title">Properties</h3>
            <div className="properties-content">
              <p className="properties-hint">
                Pilih elemen di kanvas untuk mengubah properti di sini.
              </p>
              <p className="properties-tip">
                <strong>Tip:</strong> klik tombol Background untuk mengganti
                warna dasar kanvas.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions - Removed duplicate file upload */}
        <div className="frame-builder-actions">
          <button className="action-button secondary" onClick={exportConfig}>
            💾 Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
