import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for handling pinch-to-zoom and pan gestures
 * @param {Object} options - Configuration options
 * @param {number} options.minScale - Minimum zoom scale (default: 1)
 * @param {number} options.maxScale - Maximum zoom scale (default: 4)
 * @param {Function} options.onTransformChange - Callback when transform changes
 */
export default function useZoomPan({
  minScale = 1,
  maxScale = 4,
  onTransformChange,
  initialTransform = { scale: 1, x: 0, y: 0 }
} = {}) {
  const [transform, setTransform] = useState(initialTransform);
  
  // Refs for tracking touch state
  const touchStateRef = useRef({
    isPinching: false,
    isDragging: false,
    initialDistance: 0,
    initialScale: 1,
    initialX: 0,
    initialY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    lastTapTime: 0,
  });

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two touches
  const getCenter = useCallback((touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  // Clamp value between min and max
  const clamp = useCallback((value, min, max) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  // Update transform and notify parent
  const updateTransform = useCallback((newTransform) => {
    setTransform(newTransform);
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [onTransformChange]);

  // Reset transform to initial state
  const resetTransform = useCallback(() => {
    const initial = { scale: 1, x: 0, y: 0 };
    updateTransform(initial);
  }, [updateTransform]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    const state = touchStateRef.current;
    const touches = e.touches;

    // Check for double tap to reset
    const now = Date.now();
    if (touches.length === 1 && now - state.lastTapTime < 300) {
      resetTransform();
      state.lastTapTime = 0;
      return;
    }
    state.lastTapTime = now;

    if (touches.length === 2) {
      // Start pinch zoom
      e.preventDefault();
      state.isPinching = true;
      state.isDragging = false;
      state.initialDistance = getDistance(touches[0], touches[1]);
      state.initialScale = transform.scale;
      state.initialX = transform.x;
      state.initialY = transform.y;
    } else if (touches.length === 1 && transform.scale > 1) {
      // Start pan (only if zoomed in)
      state.isDragging = true;
      state.isPinching = false;
      state.lastTouchX = touches[0].clientX;
      state.lastTouchY = touches[0].clientY;
    }
  }, [transform, getDistance, resetTransform]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    const state = touchStateRef.current;
    const touches = e.touches;

    if (state.isPinching && touches.length === 2) {
      e.preventDefault();
      
      // Calculate new scale based on pinch distance
      const currentDistance = getDistance(touches[0], touches[1]);
      const distanceRatio = currentDistance / state.initialDistance;
      let newScale = state.initialScale * distanceRatio;
      
      // Clamp scale
      newScale = clamp(newScale, minScale, maxScale);

      // Calculate pan offset to keep zoom centered
      const center = getCenter(touches[0], touches[1]);
      
      updateTransform({
        scale: newScale,
        x: transform.x,
        y: transform.y,
      });
    } else if (state.isDragging && touches.length === 1 && transform.scale > 1) {
      e.preventDefault();
      
      // Calculate pan delta
      const deltaX = touches[0].clientX - state.lastTouchX;
      const deltaY = touches[0].clientY - state.lastTouchY;
      
      // Calculate max pan based on current scale
      const maxPan = (transform.scale - 1) * 50; // Adjust multiplier as needed
      
      // Update position with bounds
      const newX = clamp(transform.x + deltaX, -maxPan, maxPan);
      const newY = clamp(transform.y + deltaY, -maxPan, maxPan);
      
      updateTransform({
        scale: transform.scale,
        x: newX,
        y: newY,
      });
      
      state.lastTouchX = touches[0].clientX;
      state.lastTouchY = touches[0].clientY;
    }
  }, [transform, getDistance, getCenter, clamp, minScale, maxScale, updateTransform]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    const state = touchStateRef.current;
    const touches = e.touches;

    if (touches.length < 2) {
      state.isPinching = false;
    }
    
    if (touches.length === 0) {
      state.isDragging = false;
      
      // If scale is below minimum, reset to 1
      if (transform.scale < 1.1) {
        resetTransform();
      }
    } else if (touches.length === 1 && transform.scale > 1) {
      // Switch from pinch to drag
      state.isDragging = true;
      state.lastTouchX = touches[0].clientX;
      state.lastTouchY = touches[0].clientY;
    }
  }, [transform.scale, resetTransform]);

  // Combined handlers object
  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  // Transform style string
  const transformStyle = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    touchAction: transform.scale > 1 ? 'none' : 'auto',
  };

  return {
    transform,
    setTransform: updateTransform,
    resetTransform,
    handlers,
    transformStyle,
    isZoomed: transform.scale > 1,
  };
}
