import { memo, useCallback, useState, useRef } from 'react';

/**
 * ZoomablePhoto - A photo component with pinch-to-zoom and pan functionality
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for the image
 * @param {Object} props.style - Additional styles for the container
 * @param {Object} props.imgStyle - Additional styles for the image
 * @param {Object} props.transform - Initial transform { scale, x, y }
 * @param {Function} props.onTransformChange - Callback when transform changes
 * @param {string} props.className - Additional class names
 */
function ZoomablePhoto({
  src,
  alt = "Photo",
  style = {},
  imgStyle = {},
  transform: initialTransform,
  onTransformChange,
  className = "",
  objectFit = "cover",
}) {
  // Internal state for transform
  const [transform, setTransform] = useState(initialTransform || { scale: 1, x: 0, y: 0 });
  
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
    containerRect: null,
  });

  const containerRef = useRef(null);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Clamp value
  const clamp = useCallback((value, min, max) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  // Update transform
  const updateTransform = useCallback((newTransform) => {
    setTransform(newTransform);
    if (onTransformChange) {
      onTransformChange(newTransform);
    }
  }, [onTransformChange]);

  // Reset transform
  const resetTransform = useCallback(() => {
    updateTransform({ scale: 1, x: 0, y: 0 });
  }, [updateTransform]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    const state = touchStateRef.current;
    const touches = e.touches;

    // Get container rect for bounds calculation
    if (containerRef.current) {
      state.containerRect = containerRef.current.getBoundingClientRect();
    }

    // Check for double tap to reset
    const now = Date.now();
    if (touches.length === 1) {
      if (now - state.lastTapTime < 300) {
        e.preventDefault();
        resetTransform();
        state.lastTapTime = 0;
        return;
      }
      state.lastTapTime = now;
    }

    if (touches.length === 2) {
      // Start pinch zoom
      e.preventDefault();
      e.stopPropagation();
      state.isPinching = true;
      state.isDragging = false;
      state.initialDistance = getDistance(touches[0], touches[1]);
      state.initialScale = transform.scale;
      state.initialX = transform.x;
      state.initialY = transform.y;
    } else if (touches.length === 1 && transform.scale > 1) {
      // Start pan (only if zoomed in)
      e.preventDefault();
      e.stopPropagation();
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
      e.stopPropagation();
      
      // Calculate new scale based on pinch distance
      const currentDistance = getDistance(touches[0], touches[1]);
      const distanceRatio = currentDistance / state.initialDistance;
      let newScale = state.initialScale * distanceRatio;
      
      // Clamp scale (1x to 4x)
      newScale = clamp(newScale, 1, 4);

      updateTransform({
        scale: newScale,
        x: state.initialX,
        y: state.initialY,
      });
    } else if (state.isDragging && touches.length === 1 && transform.scale > 1) {
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate pan delta
      const deltaX = touches[0].clientX - state.lastTouchX;
      const deltaY = touches[0].clientY - state.lastTouchY;
      
      // Calculate max pan based on current scale and container size
      const rect = state.containerRect;
      const maxPanX = rect ? (rect.width * (transform.scale - 1)) / 2 : 100;
      const maxPanY = rect ? (rect.height * (transform.scale - 1)) / 2 : 100;
      
      // Update position with bounds
      const newX = clamp(transform.x + deltaX, -maxPanX, maxPanX);
      const newY = clamp(transform.y + deltaY, -maxPanY, maxPanY);
      
      updateTransform({
        scale: transform.scale,
        x: newX,
        y: newY,
      });
      
      state.lastTouchX = touches[0].clientX;
      state.lastTouchY = touches[0].clientY;
    }
  }, [transform, getDistance, clamp, updateTransform]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    const state = touchStateRef.current;
    const touches = e.touches;

    if (touches.length < 2) {
      state.isPinching = false;
    }
    
    if (touches.length === 0) {
      state.isDragging = false;
      
      // If scale is below threshold, reset to 1
      if (transform.scale < 1.05) {
        resetTransform();
      }
    } else if (touches.length === 1 && transform.scale > 1) {
      // Switch from pinch to drag
      state.isDragging = true;
      state.lastTouchX = touches[0].clientX;
      state.lastTouchY = touches[0].clientY;
    }
  }, [transform.scale, resetTransform]);

  // Combined container styles
  const containerStyles = {
    position: 'relative',
    overflow: 'hidden',
    touchAction: transform.scale > 1 ? 'none' : 'pan-y',
    ...style,
  };

  // Image transform styles
  const imageStyles = {
    width: '100%',
    height: '100%',
    objectFit: objectFit,
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
    transition: transform.scale === 1 ? 'transform 0.2s ease-out' : 'none',
    willChange: 'transform',
    pointerEvents: 'none',
    ...imgStyle,
  };

  return (
    <div
      ref={containerRef}
      className={`zoomable-photo ${className}`}
      style={containerStyles}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        style={imageStyles}
        draggable={false}
      />
      
      {/* Zoom indicator */}
      {transform.scale > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {transform.scale.toFixed(1)}x
        </div>
      )}
    </div>
  );
}

export default memo(ZoomablePhoto);
