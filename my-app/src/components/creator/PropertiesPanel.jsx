import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, ChevronDown, ChevronUp } from "lucide-react";
import ColorPicker from "./ColorPicker.jsx";
import "./PropertiesPanel.css";

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

const CollapsibleSection = ({ title, children, isOpen, onToggle }) => {
  return (
    <div 
      style={{
        width: '100%',
        display: 'block',
        boxSizing: 'border-box'
      }}
      className="rounded-2xl border-2 border-[#e0b7a9]/30 bg-gradient-to-br from-white to-[#fdf7f4]/60 shadow-[0_6px_20px_rgba(224,183,169,0.2)] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-[0_8px_28px_rgba(224,183,169,0.3)] hover:border-[#e0b7a9]/50"
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          boxSizing: 'border-box'
        }}
        className="flex items-center justify-between px-6 py-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-[#f7e3da]/40 hover:to-[#f1cfc0]/30 active:scale-[0.99] group"
      >
        <h4 className="text-base font-bold tracking-wide text-[#4a302b] transition-colors group-hover:text-[#e0b7a9]">
          {title}
        </h4>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e0b7a9]/10 transition-all duration-300 group-hover:bg-[#e0b7a9]/20 group-hover:scale-110">
          {isOpen ? (
            <ChevronUp size={18} className="text-[#e0b7a9] flex-shrink-0 transition-transform duration-300" strokeWidth={2.5} />
          ) : (
            <ChevronDown size={18} className="text-[#e0b7a9] flex-shrink-0 transition-transform duration-300" strokeWidth={2.5} />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full overflow-hidden"
          >
            <div className="w-full px-6 pb-6 space-y-4 text-sm text-slate-600">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InputRow = ({ label, children }) => (
  <label className="flex w-full flex-col gap-3 text-xs font-bold text-slate-500">
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
  // Local state for dimension inputs
  const [localWidth, setLocalWidth] = useState("");
  const [localHeight, setLocalHeight] = useState("");
  
  // State to control which dropdown is open (only one at a time)
  const [openDropdown, setOpenDropdown] = useState(null);

  // Update local state when selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setLocalWidth(Math.round(selectedElement.width ?? 0).toString());
      setLocalHeight(Math.round(selectedElement.height ?? 0).toString());
    }
  }, [selectedElement?.id, selectedElement?.width, selectedElement?.height]);
  
  // Reset to first dropdown when element changes
  useEffect(() => {
    if (selectedElement?.type === 'background-photo') {
      setOpenDropdown('foto-background');
    } else if (selectedElement) {
      setOpenDropdown('dimensi');
    } else {
      setOpenDropdown('upload-background');
    }
  }, [selectedElement?.id]);

  const applyDimension = (dimension, value) => {
    if (!selectedElement) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      // Reset to current value if invalid
      if (dimension === "width") {
        setLocalWidth(Math.round(selectedElement.width ?? 60).toString());
      } else {
        setLocalHeight(Math.round(selectedElement.height ?? 60).toString());
      }
      return;
    }

    const finalValue = Math.max(60, Math.round(numericValue));
    onUpdateElement(selectedElement.id, {
      [dimension]: finalValue,
    });
    
    // Update local state with final value
    if (dimension === "width") {
      setLocalWidth(finalValue.toString());
    } else {
      setLocalHeight(finalValue.toString());
    }
  };

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
      <CollapsibleSection 
        title="Dimensi" 
        isOpen={openDropdown === 'dimensi'}
        onToggle={() => setOpenDropdown(openDropdown === 'dimensi' ? null : 'dimensi')}
      >
        <div className="grid grid-cols-2 gap-3">
          <InputRow label="Lebar">
            <input
              type="number"
              className="rounded-2xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-slate-700 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyDimension("width", localWidth);
                  e.target.blur();
                }
              }}
              onBlur={() => applyDimension("width", localWidth)}
            />
          </InputRow>
          <InputRow label="Tinggi">
            <input
              type="number"
              className="rounded-2xl border-2 border-[#e0b7a9]/20 bg-white px-4 py-3 text-slate-700 shadow-[0_2px_8px_rgba(224,183,169,0.08)] transition-all focus:border-[#e0b7a9]/50 focus:shadow-[0_4px_12px_rgba(224,183,169,0.15)] focus:outline-none"
              value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyDimension("height", localHeight);
                  e.target.blur();
                }
              }}
              onBlur={() => applyDimension("height", localHeight)}
            />
          </InputRow>
        </div>
      </CollapsibleSection>
    </>
  );

  const renderTextControls = () => (
    <CollapsibleSection 
      title="Pengaturan Teks" 
      isOpen={openDropdown === 'pengaturan-teks'}
      onToggle={() => setOpenDropdown(openDropdown === 'pengaturan-teks' ? null : 'pengaturan-teks')}
    >
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
          className="w-full rounded-2xl border-2 border-[#e0b7a9]/35 bg-gradient-to-br from-white to-[#fdf7f4]/50 px-4 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_4px_12px_rgba(224,183,169,0.15)] transition-all hover:border-[#d4a99a] hover:shadow-[0_6px_16px_rgba(224,183,169,0.25)] focus:border-[#d4a99a] focus:shadow-[0_6px_20px_rgba(224,183,169,0.3)] focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23e0b7a9%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-12"
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
    </CollapsibleSection>
  );

  const renderFillControls = ({ showBorderRadius = true } = {}) => (
    <CollapsibleSection 
      title="Warna & Bentuk" 
      isOpen={openDropdown === 'warna-bentuk'}
      onToggle={() => setOpenDropdown(openDropdown === 'warna-bentuk' ? null : 'warna-bentuk')}
    >
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
    </CollapsibleSection>
  );

  const renderOutlineControls = ({ defaultColor = "#d9b9ab", maxWidth = 24 } = {}) => {
    const currentWidth = Number(selectedElement.data?.strokeWidth ?? 0);
    const fallbackColor =
      typeof selectedElement.data?.stroke === "string" && selectedElement.data.stroke.length > 0
        ? selectedElement.data.stroke
        : defaultColor;

    return (
      <CollapsibleSection 
        title="Outline" 
        isOpen={openDropdown === 'outline'}
        onToggle={() => setOpenDropdown(openDropdown === 'outline' ? null : 'outline')}
      >
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
      </CollapsibleSection>
    );
  };

  const renderImageControls = () => (
    <CollapsibleSection 
      title="Gambar" 
      isOpen={openDropdown === 'gambar'}
      onToggle={() => setOpenDropdown(openDropdown === 'gambar' ? null : 'gambar')}
    >
      <InputRow label="Objek Fit">
        <select
          className="w-full rounded-2xl border-2 border-[#e0b7a9]/35 bg-gradient-to-br from-white to-[#fdf7f4]/50 px-4 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_4px_12px_rgba(224,183,169,0.15)] transition-all hover:border-[#d4a99a] hover:shadow-[0_6px_16px_rgba(224,183,169,0.25)] focus:border-[#d4a99a] focus:shadow-[0_6px_20px_rgba(224,183,169,0.3)] focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23e0b7a9%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-12"
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
    </CollapsibleSection>
  );

  const renderBackgroundPhotoControls = () => (
    <CollapsibleSection 
      title="Foto Background" 
      isOpen={openDropdown === 'foto-background'}
      onToggle={() => setOpenDropdown(openDropdown === 'foto-background' ? null : 'foto-background')}
    >
      <InputRow label="Mode Isi">
        <select
          className="w-full rounded-2xl border-2 border-[#e0b7a9]/35 bg-gradient-to-br from-white to-[#fdf7f4]/50 px-4 py-3 text-sm font-semibold text-[#4a302b] shadow-[0_4px_12px_rgba(224,183,169,0.15)] transition-all hover:border-[#d4a99a] hover:shadow-[0_6px_16px_rgba(224,183,169,0.25)] focus:border-[#d4a99a] focus:shadow-[0_6px_20px_rgba(224,183,169,0.3)] focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23e0b7a9%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-12"
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
    </CollapsibleSection>
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
        className="flex h-full w-full flex-col gap-4"
      >
        {/* Upload Background - Collapsible */}
        <CollapsibleSection 
          title="Upload Background" 
          isOpen={openDropdown === 'upload-background'}
          onToggle={() => setOpenDropdown(openDropdown === 'upload-background' ? null : 'upload-background')}
        >
          <div className="flex flex-col items-center gap-4" style={{ margin: '16px 0' }}>
            <button
              type="button"
              id="upload-bg-btn-v4-final"
              data-version="4.0"
              data-timestamp={Date.now()}
              onClick={() => {
                if (selectedElement !== "background") return;
                if (typeof window !== "undefined") {
                  const uploadEvent = new CustomEvent(
                    "creator:request-background-upload"
                  );
                  window.dispatchEvent(uploadEvent);
                }
              }}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                minHeight: '38px',
                height: '38px',
                maxHeight: '38px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #f5e5df 0%, #ecddd5 50%, #e8d4c9 100%)',
                color: '#4a302b',
                border: '2px solid #f5e5df',
                borderRadius: '12px',
                boxShadow: '0 3px 12px rgba(245, 229, 223, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '10px',
                marginBottom: '10px'
              }}
              className="group relative overflow-hidden upload-bg-v4"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 5px 16px rgba(245, 229, 223, 0.5)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ecddd5 0%, #e8d4c9 50%, #e0c5b8 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 3px 12px rgba(245, 229, 223, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #f5e5df 0%, #ecddd5 50%, #e8d4c9 100%)';
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              
              <span className="relative z-10">Unggah Foto Background</span>
            </button>
            
            {backgroundPhoto && (
              <div className="w-full flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => onSelectBackgroundPhoto?.()}
                  style={{
                    padding: '14px 20px',
                    fontSize: '15px'
                  }}
                  className="w-full flex items-center justify-center rounded-xl border-2 border-[#e0b7a9]/40 bg-white text-[#4a302b] font-medium shadow-sm transition-all duration-200 hover:bg-[#fdf7f4] hover:border-[#e0b7a9]/60 hover:shadow-md"
                >
                  Edit foto background
                </button>
                <button
                  type="button"
                  onClick={() => onFitBackgroundPhoto?.()}
                  style={{
                    padding: '14px 20px',
                    fontSize: '15px'
                  }}
                  className="w-full flex items-center justify-center rounded-xl border-2 border-[#e0b7a9]/40 bg-white text-[#4a302b] font-medium shadow-sm transition-all duration-200 hover:bg-[#fdf7f4] hover:border-[#e0b7a9]/60 hover:shadow-md"
                >
                  Sesuaikan ke kanvas
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Warna Latar - Collapsible */}
        <CollapsibleSection 
          title="Warna Latar" 
          isOpen={openDropdown === 'warna-latar'}
          onToggle={() => setOpenDropdown(openDropdown === 'warna-latar' ? null : 'warna-latar')}
        >
          <div className="flex flex-col items-center gap-3">
            <ColorPicker value={canvasBackground} onChange={onBackgroundChange} />
          </div>
        </CollapsibleSection>
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
