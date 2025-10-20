import { motion } from 'framer-motion';

export default function ToolButton({ icon: Icon, label, onClick, active, className = '' }) {
  const baseClasses = `group flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center text-sm font-semibold transition-all duration-200 ${
    active
      ? 'border-rose-200 bg-white text-rose-700 shadow-sm shadow-rose-100'
      : 'border-rose-100 bg-white text-slate-700 hover:border-rose-200 hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)] hover:text-rose-700'
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
        className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-lg transition-all ${
          active
            ? 'border-rose-200 text-rose-500'
            : 'border-rose-100/40 text-slate-500 group-hover:border-rose-200 group-hover:text-rose-500'
        }`}
      >
        {Icon ? <Icon size={22} /> : null}
      </span>
      <span className="tracking-tight">{label}</span>
    </motion.button>
  );
}
