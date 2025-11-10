import { motion } from "framer-motion";

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div style={{ width: "100%" }}>
      {(label || showPercentage) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#475569",
          }}
        >
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: "8px",
          borderRadius: "999px",
          background: "rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
            borderRadius: "999px",
            position: "relative",
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{
              x: ["0%", "200%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export function CircularProgress({
  size = 40,
  strokeWidth = 4,
  value,
  max = 100,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "inline-block",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: `${size * 0.25}px`,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        {Math.round(percentage)}
      </div>
    </div>
  );
}

export function Spinner({ size = 24, color = "#3b82f6" }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `${Math.max(2, size / 12)}px solid rgba(0, 0, 0, 0.1)`,
        borderTopColor: color,
        borderRadius: "50%",
      }}
    />
  );
}

export function StepProgress({ steps, currentStep }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {/* Step circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  background: isCompleted
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : isActive
                    ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    : "rgba(226, 232, 240, 0.8)",
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isCompleted || isActive ? "white" : "#94a3b8",
                  fontWeight: 700,
                  fontSize: "14px",
                  boxShadow:
                    isActive || isCompleted
                      ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                      : "none",
                }}
              >
                {isCompleted ? "✓" : index + 1}
              </motion.div>

              {/* Step label */}
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#1e293b" : "#64748b",
                  textAlign: "center",
                }}
              >
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
