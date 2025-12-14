/**
 * Generate Test Frame PNG with Transparent Slots
 * Run this in browser console to create test frames
 */

/**
 * Generate a simple 3-slot vertical frame
 */
function generateTestFrame3Slots() {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 888;
  const ctx = canvas.getContext("2d");

  // Background - White with red border
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 500, 888);

  // Red border
  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 492, 880);

  // Title text
  ctx.fillStyle = "#333333";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Test Frame - 3 Slots", 250, 60);

  // Transparent slots (portrait 4:5 ratio)
  const slotWidth = 280;
  const slotHeight = 350;
  const centerX = (500 - slotWidth) / 2;

  // Slot 1 (top)
  ctx.clearRect(centerX, 100, slotWidth, slotHeight);

  // Slot 2 (middle)
  ctx.clearRect(centerX, 470, slotWidth, slotHeight);

  // Slot 3 (bottom - smaller)
  ctx.clearRect(centerX + 40, 840, slotWidth - 80, 40);

  // Add slot labels (will be visible through transparency)
  ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
  ctx.font = "18px Arial";
  ctx.fillText("Slot 1", 250, 280);
  ctx.fillText("Slot 2", 250, 650);

  // Download
  downloadCanvas(canvas, "test-frame-3-slots.png");
}

/**
 * Generate a 4-slot grid frame
 */
function generateTestFrame4SlotsGrid() {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 888;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 888);
  gradient.addColorStop(0, "#ffd6e8");
  gradient.addColorStop(1, "#c8e6ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 500, 888);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 500, 80);
  ctx.fillStyle = "#333333";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("4-Slot Grid Frame", 250, 50);

  // 2x2 Grid of transparent slots
  const slotWidth = 220;
  const slotHeight = 280;
  const spacing = 20;
  const startX = (500 - (slotWidth * 2 + spacing)) / 2;
  const startY = 120;

  // Row 1
  ctx.clearRect(startX, startY, slotWidth, slotHeight);
  ctx.clearRect(startX + slotWidth + spacing, startY, slotWidth, slotHeight);

  // Row 2
  ctx.clearRect(startX, startY + slotHeight + spacing, slotWidth, slotHeight);
  ctx.clearRect(
    startX + slotWidth + spacing,
    startY + slotHeight + spacing,
    slotWidth,
    slotHeight
  );

  downloadCanvas(canvas, "test-frame-4-slots-grid.png");
}

/**
 * Generate a 6-slot mixed layout frame
 */
function generateTestFrame6SlotsMixed() {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 888;
  const ctx = canvas.getContext("2d");

  // Background - Cream color
  ctx.fillStyle = "#fff8f0";
  ctx.fillRect(0, 0, 500, 888);

  // Decorative border
  ctx.strokeStyle = "#d4a89a";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 494, 882);

  // Title
  ctx.fillStyle = "#2d1b14";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("6-Slot Mixed", 250, 50);

  // Large top slot
  ctx.clearRect(50, 80, 400, 200);

  // Middle 4 small slots (2x2)
  const smallWidth = 180;
  const smallHeight = 220;
  const spacing = 20;
  const centerX = (500 - (smallWidth * 2 + spacing)) / 2;

  ctx.clearRect(centerX, 300, smallWidth, smallHeight);
  ctx.clearRect(centerX + smallWidth + spacing, 300, smallWidth, smallHeight);
  ctx.clearRect(centerX, 300 + smallHeight + spacing, smallWidth, smallHeight);
  ctx.clearRect(
    centerX + smallWidth + spacing,
    300 + smallHeight + spacing,
    smallWidth,
    smallHeight
  );

  // Bottom wide slot
  ctx.clearRect(50, 800, 400, 70);

  downloadCanvas(canvas, "test-frame-6-slots-mixed.png");
}

/**
 * Generate frame with custom border design
 */
function generateFancyBorderFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 888;
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 500, 888);

  // Fancy gradient border
  const borderGradient = ctx.createLinearGradient(0, 0, 500, 888);
  borderGradient.addColorStop(0, "#ff6b9d");
  borderGradient.addColorStop(0.5, "#c44569");
  borderGradient.addColorStop(1, "#8e44ad");

  // Outer border
  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 480, 868);

  // Inner border
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(25, 25, 450, 838);

  // Corner decorations
  ctx.fillStyle = borderGradient;
  const corners = [
    [25, 25],
    [475, 25],
    [25, 863],
    [475, 863],
  ];
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3 vertical slots
  const slotWidth = 300;
  const slotHeight = 240;
  const centerX = (500 - slotWidth) / 2;

  ctx.clearRect(centerX, 80, slotWidth, slotHeight);
  ctx.clearRect(centerX, 350, slotWidth, slotHeight);
  ctx.clearRect(centerX, 620, slotWidth, slotHeight);

  downloadCanvas(canvas, "test-frame-fancy-border.png");
}

/**
 * Generate polaroid-style frame
 */
function generatePolaroidFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 888;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#f9f9f9";
  ctx.fillRect(0, 0, 500, 888);

  // Title at top
  ctx.fillStyle = "#000000";
  ctx.font = '20px "Courier New"';
  ctx.textAlign = "center";
  ctx.fillText("POLAROID MEMORIES", 250, 40);

  // 3 Polaroid-style slots
  const polaroidWidth = 340;
  const photoHeight = 340;
  const captionHeight = 80;
  const polaroidHeight = photoHeight + captionHeight;
  const centerX = (500 - polaroidWidth) / 2;

  // Polaroid 1
  drawPolaroid(ctx, centerX, 70, polaroidWidth, photoHeight, captionHeight);

  // Polaroid 2
  drawPolaroid(
    ctx,
    centerX,
    70 + polaroidHeight + 30,
    polaroidWidth,
    photoHeight,
    captionHeight
  );

  // Polaroid 3 (smaller)
  const smallWidth = 280;
  const smallHeight = 280;
  drawPolaroid(
    ctx,
    (500 - smallWidth) / 2,
    70 + (polaroidHeight + 30) * 2,
    smallWidth,
    smallHeight,
    60
  );

  downloadCanvas(canvas, "test-frame-polaroid.png");
}

function drawPolaroid(ctx, x, y, width, photoHeight, captionHeight) {
  // White polaroid background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, photoHeight + captionHeight);

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, photoHeight + captionHeight);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Transparent photo area
  ctx.clearRect(x + 15, y + 15, width - 30, photoHeight - 15);

  // Caption area (white)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 15, y + photoHeight, width - 30, captionHeight - 15);
}

/**
 * Helper to download canvas as PNG
 */
function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded: ${filename}`);
  }, "image/png");
}

/**
 * Generate all test frames
 */
function generateAllTestFrames() {
  console.log("🎨 Generating test frames...");

  setTimeout(() => generateTestFrame3Slots(), 100);
  setTimeout(() => generateTestFrame4SlotsGrid(), 600);
  setTimeout(() => generateTestFrame6SlotsMixed(), 1100);
  setTimeout(() => generateFancyBorderFrame(), 1600);
  setTimeout(() => generatePolaroidFrame(), 2100);

  console.log("✅ All test frames will download shortly...");
}

// Export functions
if (typeof window !== "undefined") {
  window.FrameGenerator = {
    generate3Slots: generateTestFrame3Slots,
    generate4Slots: generateTestFrame4SlotsGrid,
    generate6Slots: generateTestFrame6SlotsMixed,
    generateFancy: generateFancyBorderFrame,
    generatePolaroid: generatePolaroidFrame,
    generateAll: generateAllTestFrames,
  };

  console.log("🎨 Frame Generator Ready!");
  console.log("Usage:");
  console.log("  FrameGenerator.generate3Slots()");
  console.log("  FrameGenerator.generate4Slots()");
  console.log("  FrameGenerator.generate6Slots()");
  console.log("  FrameGenerator.generateFancy()");
  console.log("  FrameGenerator.generatePolaroid()");
  console.log("  FrameGenerator.generateAll()");
}
