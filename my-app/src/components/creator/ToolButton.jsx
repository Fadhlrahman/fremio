import { motion } from 'framer-motion';

export default function ToolButton({ icon: Icon, label, onClick, active, className = '' }) {
  const baseClasses = `group flex h-full w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 ${
    active
      ? 'border-rose-200 bg-rose-50/80 text-rose-700 shadow-sm shadow-rose-100'
      : 'border-rose-100/20 bg-white/70 text-slate-700 hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-700'
  }`;
  const combinedClasses = `${baseClasses} ${className}`.trim();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={combinedClasses}
      whileTap={{ scale: 0.99 }}
      whileHover={{ y: -2 }}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-all ${
          active
            ? 'border-rose-200 bg-white text-rose-500'
            : 'border-rose-100/40 bg-white/80 text-slate-500 group-hover:border-rose-200 group-hover:bg-white group-hover:text-rose-500'
        }`}
      >
        {Icon ? <Icon size={22} /> : null}
      </span>
      <span className="tracking-tight">{label}</span>
    </motion.button>
  );
}
