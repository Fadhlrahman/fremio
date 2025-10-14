import React, { useRef, useState } from 'react';

export default function FrameBuilder() {
  const [frameImg, setFrameImg] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dragSlot, setDragSlot] = useState(null);
  const canvasRef = useRef();

  // Handle frame image upload..
  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFrameImg(url);
  };

  // Add new slot (rectangle)
  const addSlot = () => {
    setSlots([...slots, { x: 100, y: 100, width: 200, height: 250, shape: 'rect', id: Date.now() }]);
  };

  // Drag & resize logic (sederhana).
  const handleMouseDown = (e, idx) => {
    setDragSlot({ idx, offsetX: e.nativeEvent.offsetX - slots[idx].x, offsetY: e.nativeEvent.offsetY - slots[idx].y });
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

  // Export JSON config.
  const exportConfig = () => {
    const config = {
      frame_id: 'custom_frame',
      canvas_size: { width: 1080, height: 1620 },
      slots: slots.map(({ x, y, width, height, shape, id }) => ({ id, shape, x, y, width, height }))
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert('Config copied to clipboard!');
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFrameUpload} />
      <button onClick={addSlot}>Add Slot</button>
      <button onClick={exportConfig}>Export JSON</button>
      <div
        style={{ position: 'relative', width: 540, height: 810, border: '1px solid #ccc', marginTop: 16 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={540}
          height={810}
          style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}
        />
        {frameImg && (
          <img
            src={frameImg}
            alt="Frame"
            style={{ width: 540, height: 810, position: 'absolute', left: 0, top: 0, zIndex: 2, pointerEvents: 'none' }}
          />
        )}
        {slots.map((slot, idx) => (
          <div
            key={slot.id}
            style={{
              position: 'absolute',
              left: slot.x,
              top: slot.y,
              width: slot.width,
              height: slot.height,
              border: '2px dashed #0070f3',
              background: 'rgba(0,112,243,0.08)',
              zIndex: 3,
              cursor: 'move'
            }}
            onMouseDown={(e) => handleMouseDown(e, idx)}
          />
        ))}
      </div>
    </div>
  );
}
