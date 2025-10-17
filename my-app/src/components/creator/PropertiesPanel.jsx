import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';

const panelVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

const Section = ({ title, children }) => (
  <div className="space-y-4 rounded-3xl border border-rose-100/70 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
    <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
    <div className="space-y-3 text-sm text-slate-600">{children}</div>
  </div>
);

const InputRow = ({ label, children }) => (
  <label className="flex flex-col gap-2 text-xs font-medium text-slate-500">
    <span className="uppercase tracking-[0.18em] text-slate-400">{label}</span>
    {children}
  </label>
);

export default function PropertiesPanel({
  selectedElement,
  canvasBackground,
  onBackgroundChange,
  onUpdateElement,
  onDeleteElement,
  clearSelection
}) {
  const renderSharedControls = () => (
    <Section title="Dimensi">
      <div className="grid grid-cols-2 gap-3">
        <InputRow label="Lebar">
          <input
            type="number"
            min={60}
            className="rounded-xl border border-rose-100/70 bg-white px-3 py-2 text-slate-700 shadow-inner focus:border-rose-300 focus:outline-none"
            value={Math.round(selectedElement?.width ?? 0)}
            onChange={(event) =>
              onUpdateElement(selectedElement.id, {
                width: Number(event.target.value) || selectedElement.width
              })
            }
          />
        </InputRow>
        <InputRow label="Tinggi">
          <input
            type="number"
            min={60}
            className="rounded-xl border border-rose-100/70 bg-white px-3 py-2 text-slate-700 shadow-inner focus:border-rose-300 focus:outline-none"
            value={Math.round(selectedElement?.height ?? 0)}
            onChange={(event) =>
              onUpdateElement(selectedElement.id, {
                height: Number(event.target.value) || selectedElement.height
              })
            }
          />
        </InputRow>
      </div>
    </Section>
  );

  const renderTextControls = () => (
    <Section title="Pengaturan Teks">
      <InputRow label="Isi Teks">
        <textarea
          rows={3}
          className="min-h-[90px] rounded-2xl border border-rose-100/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-rose-300 focus:outline-none"
          value={selectedElement.data?.text ?? ''}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { text: event.target.value }
            })
          }
        />
      </InputRow>
      <div className="grid grid-cols-2 gap-3">
        <InputRow label="Ukuran">
          <input
            type="range"
            min={12}
            max={64}
            value={selectedElement.data?.fontSize ?? 24}
            onChange={(event) =>
              onUpdateElement(selectedElement.id, {
                data: { fontSize: Number(event.target.value) }
              })
            }
          />
          <div className="text-xs font-semibold text-slate-500">
            {selectedElement.data?.fontSize ?? 24}px
          </div>
        </InputRow>
        <InputRow label="Warna">
          <input
            type="color"
            className="h-11 w-full cursor-pointer rounded-xl border border-rose-100/70"
            value={selectedElement.data?.color ?? '#1f2933'}
            onChange={(event) =>
              onUpdateElement(selectedElement.id, {
                data: { color: event.target.value }
              })
            }
          />
        </InputRow>
      </div>
      <InputRow label="Perataan">
        <div className="grid grid-cols-3 gap-2">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              type="button"
              onClick={() =>
                onUpdateElement(selectedElement.id, {
                  data: { align }
                })
              }
              className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                selectedElement.data?.align === align
                  ? 'bg-rose-100 text-rose-600 shadow'
                  : 'bg-white text-slate-500 shadow-sm hover:bg-rose-50'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </InputRow>
    </Section>
  );

  const renderFillControls = ({ showBorderRadius = true } = {}) => (
    <Section title="Warna & Bentuk">
      <InputRow label="Warna Isi">
        <input
          type="color"
          className="h-11 w-full cursor-pointer rounded-xl border border-rose-100/70"
          value={selectedElement.data?.fill ?? '#f4d3c2'}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { fill: event.target.value }
            })
          }
        />
      </InputRow>
      {showBorderRadius && (
        <InputRow label="Radius">
          <input
            type="range"
            min={0}
            max={120}
            value={selectedElement.data?.borderRadius ?? 24}
            onChange={(event) =>
              onUpdateElement(selectedElement.id, {
                data: { borderRadius: Number(event.target.value) }
              })
            }
          />
        </InputRow>
      )}
    </Section>
  );

  const renderImageControls = () => (
    <Section title="Gambar">
      <InputRow label="Objek Fit">
        <select
          className="rounded-xl border border-rose-100/70 bg-white px-3 py-2 text-sm text-slate-600 focus:border-rose-300 focus:outline-none"
          value={selectedElement.data?.objectFit ?? 'cover'}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { objectFit: event.target.value }
            })
          }
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </InputRow>
      {selectedElement.type === 'upload' && selectedElement.data?.image && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-600"
          onClick={() =>
            onUpdateElement(selectedElement.id, {
              data: { image: null }
            })
          }
        >
          <X size={14} /> Hapus gambar
        </button>
      )}
    </Section>
  );

  const renderEmptyState = () => (
    <motion.div
      variants={panelVariant}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-rose-100/70 bg-white/90 p-6 text-center text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      <p>Pilih elemen di kanvas untuk mengubah properti di sini.</p>
      <p className="text-xs text-slate-400">
        Tip: klik tombol Background untuk mengganti warna dasar kanvas.
      </p>
    </motion.div>
  );

  if (selectedElement === 'background') {
    return (
      <motion.div
        variants={panelVariant}
        initial="hidden"
        animate="visible"
        className="flex h-full flex-col gap-4"
      >
        <Section title="Warna Latar">
          <InputRow label="Background">
            <input
              type="color"
              className="h-12 w-full cursor-pointer rounded-xl border border-rose-100/70"
              value={canvasBackground}
              onChange={(event) => onBackgroundChange(event.target.value)}
            />
          </InputRow>
        </Section>
      </motion.div>
    );
  }

  if (!selectedElement) {
    return renderEmptyState();
  }

  return (
    <motion.div
      variants={panelVariant}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col gap-4"
    >
      {renderSharedControls()}

      {selectedElement.type === 'text' && renderTextControls()}

      {selectedElement.type === 'shape' && renderFillControls({ showBorderRadius: true })}

      {selectedElement.type === 'photo' && renderFillControls({ showBorderRadius: true })}

      {selectedElement.type === 'upload' && (
        <>
          {renderImageControls()}
          {renderFillControls({ showBorderRadius: true })}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          onDeleteElement(selectedElement.id);
          clearSelection();
        }}
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
      >
        <Trash2 size={16} /> Hapus Element
      </button>
    </motion.div>
  );
}
