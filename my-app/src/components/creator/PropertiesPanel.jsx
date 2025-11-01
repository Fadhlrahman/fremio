import { motion } from "framer-motion";
import { X, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import ColorPicker from "./ColorPicker.jsx";

const panelVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const Section = ({ title, children }) => (
  <div className="space-y-5 rounded-[24px] border border-[#e0b7a9]/15 bg-gradient-to-br from-white via-white/95 to-[#fdf7f4]/40 p-6 shadow-[0_8px_24px_rgba(224,183,169,0.1),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm">
    <h4 className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-sm font-bold uppercase tracking-wider text-transparent">
      {title}
    </h4>
    <div className="space-y-4 text-sm text-slate-600">{children}</div>
  </div>
);

const InputRow = ({ label, children }) => (
  <label className="flex flex-col gap-3 text-xs font-bold text-slate-500">
    <span className="uppercase tracking-[0.2em] text-[#e0b7a9]">{label}</span>
    {children}
  </label>
);

export default function PropertiesPanel({
  selectedElement,
  canvasBackground,
  onBackgroundChange,
  onUpdateElement,
  onDeleteElement,
  clearSelection,
  onSelectBackgroundPhoto = () => {},
  onFitBackgroundPhoto = () => {},
  backgroundPhoto = null,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
}) {
  const handleDimensionInput = (dimension, rawValue) => {
    if (!selectedElement || typeof rawValue === "undefined") {
      return;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const nextValue = Math.round(
      numericValue > 0 ? numericValue : selectedElement[dimension]
    );
    const minFallback = 60;
    onUpdateElement(selectedElement.id, {
      [dimension]: Math.max(minFallback, nextValue),
    });
  };

  const renderSharedControls = () => (
    <>
      {selectedElement?.type !== 'background-photo' && (
        <Section title="Lapisan">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onBringToFront?.(selectedElement.id)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#e0b7a9]/40 hover:bg-[#fdf7f4] hover:shadow-md active:scale-95"
            >
              <ChevronsUp size={18} className="text-[#e0b7a9]" />
              Paling Depan
            </button>
            <button
              onClick={() => onSendToBack?.(selectedElement.id)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#e0b7a9]/40 hover:bg-[#fdf7f4] hover:shadow-md active:scale-95"
            >
              <ChevronsDown size={18} className="text-[#e0b7a9]" />
              Paling Belakang
            </button>
            <button
              onClick={() => onBringForward?.(selectedElement.id)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#e0b7a9]/40 hover:bg-[#fdf7f4] hover:shadow-md active:scale-95"
            >
              <ArrowUp size={18} className="text-[#e0b7a9]" />
              Kedepankan
            </button>
            <button
              onClick={() => onSendBackward?.(selectedElement.id)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-[#e0b7a9]/40 hover:bg-[#fdf7f4] hover:shadow-md active:scale-95"
            >
              <ArrowDown size={18} className="text-[#e0b7a9]" />
              Kebelakangkan
            </button>
          </div>
        </Section>
      )}
      <Section title="Dimensi">
        <div className="grid grid-cols-2 gap-3">
          <InputRow label="Lebar">
            <input
              type="number"
              min={60}
              className="rounded-2xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-slate-700 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
              value={Math.round(selectedElement?.width ?? 0)}
              onChange={(event) => handleDimensionInput("width", event.target.value)}
            />
          </InputRow>
          <InputRow label="Tinggi">
            <input
              type="number"
              min={60}
              className="rounded-2xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-slate-700 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
              value={Math.round(selectedElement?.height ?? 0)}
              onChange={(event) => handleDimensionInput("height", event.target.value)}
            />
          </InputRow>
        </div>
      </Section>
    </>
  );

  const renderTextControls = () => (
    <Section title="Pengaturan Teks">
      <InputRow label="Isi Teks">
        <textarea
          rows={3}
          className="min-h-[100px] rounded-2xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
          value={selectedElement.data?.text ?? ""}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { text: event.target.value },
            })
          }
        />
      </InputRow>
      <InputRow label="Font">
        <select
          className="rounded-xl border-2 border-[#e0b7a9]/20 bg-white px-3 py-2 text-sm text-slate-600 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
          value={selectedElement.data?.fontFamily ?? 'Inter'}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { fontFamily: event.target.value },
            })
          }
        >
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Lato">Lato</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Poppins">Poppins</option>
          <option value="Nunito Sans">Nunito Sans</option>
          <option value="Rubik">Rubik</option>
          <option value="Work Sans">Work Sans</option>
          <option value="Source Sans Pro">Source Sans Pro</option>
          <option value="Merriweather">Merriweather</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Libre Baskerville">Libre Baskerville</option>
          <option value="Cormorant Garamond">Cormorant Garamond</option>
          <option value="Bitter">Bitter</option>
          <option value="Raleway">Raleway</option>
          <option value="Oswald">Oswald</option>
          <option value="Bebas Neue">Bebas Neue</option>
          <option value="Anton">Anton</option>
          <option value="Pacifico">Pacifico</option>
        </select>
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
                data: { fontSize: Number(event.target.value) },
              })
            }
          />
          <div className="text-xs font-semibold text-slate-500">
            {selectedElement.data?.fontSize ?? 24}px
          </div>
        </InputRow>
        <InputRow label="Warna">
          <ColorPicker
            value={selectedElement.data?.color ?? "#1F2933"}
            onChange={(nextColor) =>
              onUpdateElement(selectedElement.id, {
                data: { color: nextColor },
              })
            }
          />
        </InputRow>
      </div>
      <InputRow label="Perataan">
        <div className="grid grid-cols-3 gap-3">
          {["left", "center", "right"].map((align) => (
            <button
              key={align}
              type="button"
              onClick={() =>
                onUpdateElement(selectedElement.id, {
                  data: { align },
                })
              }
              className={`rounded-2xl px-4 py-3 text-sm font-bold capitalize transition-all ${
                selectedElement.data?.align === align
                  ? "bg-gradient-to-r from-[#e0b7a9] to-[#d4a99a] text-white shadow-[0_4px_12px_rgba(224,183,169,0.3)]"
                  : "border-2 border-[#e0b7a9]/20 bg-white text-slate-600 shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:border-[#e0b7a9]/40 hover:bg-[#fdf7f4]/50 hover:shadow-[0_4px_12px_rgba(224,183,169,0.15)]"
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
        <ColorPicker
          value={selectedElement.data?.fill ?? "#F4D3C2"}
          onChange={(nextColor) =>
            onUpdateElement(selectedElement.id, {
              data: { fill: nextColor },
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
                data: { borderRadius: Number(event.target.value) },
              })
            }
          />
        </InputRow>
      )}
    </Section>
  );

  const renderOutlineControls = ({ defaultColor = "#d9b9ab", maxWidth = 24 } = {}) => {
    const currentWidth = Number(selectedElement.data?.strokeWidth ?? 0);
    const fallbackColor =
      typeof selectedElement.data?.stroke === "string" && selectedElement.data.stroke.length > 0
        ? selectedElement.data.stroke
        : defaultColor;

    return (
      <Section title="Outline">
        <InputRow label="Ketebalan">
          <input
            type="range"
            min={0}
            max={maxWidth}
            value={currentWidth}
            onChange={(event) => {
              const nextWidth = Number(event.target.value);
              if (!Number.isFinite(nextWidth)) {
                return;
              }
              const updates = {
                strokeWidth: Math.max(0, nextWidth),
              };
              if (nextWidth > 0 && !selectedElement.data?.stroke) {
                updates.stroke = fallbackColor;
              }
              onUpdateElement(selectedElement.id, { data: updates });
            }}
          />
          <div className="text-xs font-semibold text-slate-500">
            {Math.round(currentWidth)}px
          </div>
        </InputRow>
        <InputRow label="Warna Outline">
          <ColorPicker
            value={fallbackColor}
            onChange={(nextColor) =>
              onUpdateElement(selectedElement.id, {
                data: { stroke: nextColor },
              })
            }
          />
        </InputRow>
      </Section>
    );
  };

  const renderImageControls = () => (
    <Section title="Gambar">
      <InputRow label="Objek Fit">
        <select
          className="rounded-xl border border-rose-100/70 bg-white px-3 py-2 text-sm text-slate-600 focus:border-rose-300 focus:outline-none"
          value={selectedElement.data?.objectFit ?? "contain"}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { objectFit: event.target.value },
            })
          }
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </InputRow>
      {selectedElement.data?.image && (
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-600"
          onClick={() =>
            onUpdateElement(selectedElement.id, {
              data: { image: null },
            })
          }
        >
          <X size={14} /> Hapus gambar
        </button>
      )}
    </Section>
  );

  const renderBackgroundPhotoControls = () => (
    <Section title="Foto Background">
      <InputRow label="Mode Isi">
        <select
          className="rounded-xl border border-rose-100/70 bg-white px-3 py-2 text-sm text-slate-600 focus:border-rose-300 focus:outline-none"
          value={selectedElement.data?.objectFit ?? "contain"}
          onChange={(event) =>
            onUpdateElement(selectedElement.id, {
              data: { objectFit: event.target.value },
            })
          }
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </InputRow>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              const uploadEvent = new CustomEvent(
                "creator:request-background-upload"
              );
              window.dispatchEvent(uploadEvent);
            }
          }}
          className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#e0b7a9]/40 bg-gradient-to-r from-[#f7e3da] to-[#f1cfc0] px-5 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_6px_16px_rgba(224,183,169,0.25)] transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_26px_rgba(224,183,169,0.35)]"
        >
          Ganti foto background
        </button>
        <button
          type="button"
          onClick={() => onFitBackgroundPhoto?.()}
          className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#e0b7a9]/40 bg-white px-5 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_4px_12px_rgba(224,183,169,0.18)] transition-all hover:translate-y-[-2px] hover:shadow-[0_10px_24px_rgba(224,183,169,0.24)]"
        >
          Sesuaikan ke kanvas
        </button>
        {selectedElement.data?.image && (
          <button
            type="button"
            onClick={() => {
              onDeleteElement(selectedElement.id);
              clearSelection();
            }}
            className="flex items-center justify-center gap-3 rounded-2xl border-2 border-red-200/50 bg-gradient-to-r from-red-50 to-red-100/60 px-5 py-3 text-sm font-semibold text-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.18)] transition-all hover:translate-y-[-2px] hover:shadow-[0_10px_22px_rgba(239,68,68,0.25)]"
          >
            <X size={14} /> Hapus foto background
          </button>
        )}
      </div>
    </Section>
  );

  const renderEmptyState = () => (
    <motion.div
      variants={panelVariant}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-[#e0b7a9]/15 bg-gradient-to-br from-white/95 via-white/90 to-[#fdf7f4]/50 p-8 text-center text-sm text-slate-500 shadow-[0_12px_32px_rgba(224,183,169,0.12)] backdrop-blur-sm"
    >
      <p className="font-semibold text-slate-600">
        Pilih elemen di kanvas untuk mengubah properti di sini.
      </p>
      <p className="text-xs font-medium text-[#e0b7a9]">
        💡 Tip: klik tombol Background untuk mengganti warna dasar kanvas.
      </p>
    </motion.div>
  );

  if (selectedElement === "background") {
    return (
      <motion.div
        variants={panelVariant}
        initial="hidden"
        animate="visible"
        className="flex h-full flex-col gap-4"
      >
        <Section title="Warna Latar">
          <InputRow label="Background">
            <ColorPicker value={canvasBackground} onChange={onBackgroundChange} />
          </InputRow>
          {backgroundPhoto ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => onSelectBackgroundPhoto?.()}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#e0b7a9]/40 bg-white px-5 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_4px_12px_rgba(224,183,169,0.18)] transition-all hover:translate-y-[-2px] hover:shadow-[0_10px_24px_rgba(224,183,169,0.24)]"
              >
                Edit foto background
              </button>
              <button
                type="button"
                onClick={() => onFitBackgroundPhoto?.()}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#e0b7a9]/40 bg-gradient-to-r from-[#f7e3da] to-[#f1cfc0] px-5 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_6px_16px_rgba(224,183,169,0.25)] transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_26px_rgba(224,183,169,0.35)]"
              >
                Sesuaikan ke kanvas
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (selectedElement !== "background") return;
              if (typeof window !== "undefined") {
                const uploadEvent = new CustomEvent(
                  "creator:request-background-upload"
                );
                window.dispatchEvent(uploadEvent);
              }
            }}
            className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#e0b7a9]/40 bg-gradient-to-r from-[#f7e3da] to-[#f1cfc0] px-5 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_6px_16px_rgba(224,183,169,0.25)] transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_26px_rgba(224,183,169,0.35)]"
          >
            Unggah foto background
          </button>
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
      {selectedElement.type !== "background-photo" && renderSharedControls()}

      {selectedElement.type === "text" && renderTextControls()}

      {selectedElement.type === "shape" &&
        <>
          {renderFillControls({ showBorderRadius: true })}
          {renderOutlineControls({ defaultColor: "#d9b9ab", maxWidth: 32 })}
        </>}

      {selectedElement.type === "photo" && (
        <>
          {renderFillControls({ showBorderRadius: true })}
          {renderOutlineControls({ defaultColor: "#f4f4f4", maxWidth: 24 })}
        </>
      )}

      {selectedElement.type === "upload" && (
        <>
          {renderImageControls()}
          {renderFillControls({ showBorderRadius: true })}
          {renderOutlineControls({ defaultColor: "#f4f4f4", maxWidth: 24 })}
        </>
      )}

      {selectedElement.type === "background-photo" &&
        renderBackgroundPhotoControls()}

      <button
        type="button"
        onClick={() => {
          onDeleteElement(selectedElement.id);
          clearSelection();
        }}
        className="mt-auto flex items-center justify-center gap-3 rounded-2xl border-2 border-red-200/50 bg-gradient-to-r from-red-50 to-red-100/50 px-5 py-4 text-sm font-bold text-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.15)] transition-all hover:border-red-300 hover:bg-gradient-to-r hover:from-red-100 hover:to-red-100 hover:shadow-[0_6px_16px_rgba(239,68,68,0.25)] active:scale-95"
      >
        <Trash2 size={18} strokeWidth={2.5} /> Hapus Element
      </button>
    </motion.div>
  );
}
