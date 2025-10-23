import { motion } from "framer-motion";

export default function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
  className = "",
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 px-4 py-5 text-center font-bold transition-all duration-300 ${
        active
          ? "border-transparent bg-gradient-to-br from-[#e0b7a9] via-[#d4a99a] to-[#c89585] text-white shadow-[0_8px_24px_rgba(224,183,169,0.4),0_4px_12px_rgba(0,0,0,0.1)]"
          : "border-[#e0b7a9]/30 bg-gradient-to-br from-white to-gray-50 text-slate-700 hover:border-[#e0b7a9] hover:shadow-[0_12px_32px_rgba(224,183,169,0.25),0_4px_16px_rgba(0,0,0,0.08)]"
      } ${className}`.trim()}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Gradient overlay on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-[#e0b7a9]/0 via-[#e0b7a9]/0 to-[#e0b7a9]/0 transition-all duration-500 ${
          !active
            ? "group-hover:from-[#e0b7a9]/10 group-hover:via-[#e0b7a9]/5 group-hover:to-transparent"
            : ""
        }`}
      />

      {/* Shimmer effect */}
      <div
        className={`absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ${
          !active ? "group-hover:translate-x-full" : ""
        }`}
      />

      <span
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-xl transition-all duration-300 ${
          active
            ? "border-white/30 bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
            : "border-[#e0b7a9]/20 bg-gradient-to-br from-white to-gray-50 text-[#e0b7a9] shadow-[0_2px_8px_rgba(224,183,169,0.15)] group-hover:border-[#e0b7a9]/40 group-hover:bg-gradient-to-br group-hover:from-[#e0b7a9]/10 group-hover:to-white group-hover:text-[#d4a99a] group-hover:shadow-[0_4px_12px_rgba(224,183,169,0.3)] group-hover:scale-110 group-hover:rotate-3"
        }`}
      >
        {Icon ? <Icon size={26} strokeWidth={2.5} /> : null}
      </span>
      <span
        className={`relative z-10 text-sm tracking-wide transition-all duration-300 ${
          active ? "text-white" : "text-slate-700 group-hover:text-[#c89585]"
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}
