import { motion } from "framer-motion";

const shimmerAnimation = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "linear",
  },
};

const shimmerGradient =
  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)";

export function SkeletonBox({ width, height, borderRadius = 8, style = {} }) {
  return (
    <motion.div
      {...shimmerAnimation}
      style={{
        width,
        height,
        borderRadius: `${borderRadius}px`,
        background: "#e2e8f0",
        backgroundImage: shimmerGradient,
        backgroundSize: "200% 100%",
        ...style,
      }}
    />
  );
}

export function SkeletonText({ width = "100%", height = 16, style = {} }) {
  return (
    <SkeletonBox width={width} height={height} borderRadius={4} style={style} />
  );
}

export function SkeletonCircle({ size = 40, style = {} }) {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

export function SkeletonFrame() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "350px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Frame image skeleton */}
      <SkeletonBox width="100%" height="450px" borderRadius={16} />

      {/* Frame title */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SkeletonText width="70%" height={20} />
        <SkeletonText width="50%" height={16} />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <SkeletonBox width="100%" height={48} borderRadius={12} />
        <SkeletonBox width="100%" height={48} borderRadius={12} />
      </div>
    </div>
  );
}

export function SkeletonPhotoGrid({ count = 4 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        padding: "20px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} width="100%" height="200px" borderRadius={12} />
      ))}
    </div>
  );
}

export function SkeletonCanvas() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Canvas area */}
      <SkeletonBox width="100%" height="600px" borderRadius={16} />

      {/* Tools bar */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCircle key={i} size={48} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonEditPhoto() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SkeletonBox width="120px" height="40px" borderRadius={12} />
        <SkeletonBox width="150px" height="40px" borderRadius={12} />
      </div>

      {/* Preview area */}
      <SkeletonBox width="100%" height="500px" borderRadius={16} />

      {/* Filter controls */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          padding: "10px 0",
        }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flexShrink: 0 }}>
            <SkeletonBox width="80px" height="80px" borderRadius={12} />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <SkeletonBox width="100%" height="56px" borderRadius={12} />
        <SkeletonBox width="100%" height="56px" borderRadius={12} />
      </div>
    </div>
  );
}

export function LoadingOverlay({
  message = "Loading...",
  progress,
  steps,
  currentStep,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: "white",
          borderRadius: "24px",
          padding: "40px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            width: "60px",
            height: "60px",
            border: "4px solid rgba(0, 0, 0, 0.1)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
          }}
        />

        {/* Message */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#1e293b",
            textAlign: "center",
          }}
        >
          {message}
        </div>

        {/* Progress bar */}
        {typeof progress === "number" && (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                borderRadius: "999px",
                background: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
                  borderRadius: "999px",
                }}
              />
            </div>
          </div>
        )}

        {/* Steps */}
        {steps && typeof currentStep === "number" && (
          <div style={{ width: "100%" }}>
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 0",
                    opacity: isCompleted ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: isCompleted
                        ? "#10b981"
                        : isActive
                        ? "#3b82f6"
                        : "#e2e8f0",
                      color: isCompleted || isActive ? "white" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#1e293b" : "#64748b",
                    }}
                  >
                    {step}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
