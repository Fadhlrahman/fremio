import { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import "./ColorPicker.css";

const isValidHex = (value) => /^#([0-9A-Fa-f]{6})$/.test(value ?? "");

export default function ColorPicker({ value = "#FFFFFF", onChange }) {
  const normalizedValue = useMemo(() => {
    if (typeof value !== "string") {
      return "#FFFFFF";
    }
    return value.startsWith("#") ? value.toUpperCase() : `#${value.toUpperCase()}`;
  }, [value]);
  
  const [hexInput, setHexInput] = useState(normalizedValue);

  useEffect(() => {
    setHexInput(normalizedValue);
  }, [normalizedValue]);

  const handlePickerChange = (nextColor) => {
    const normalized = nextColor.startsWith("#")
      ? nextColor.toUpperCase()
      : `#${nextColor.toUpperCase()}`;
    setHexInput(normalized);
    onChange?.(normalized);
  };

  const handleHexInputChange = (event) => {
    const nextValue = event.target.value.toUpperCase();
    setHexInput(nextValue);
    if (isValidHex(nextValue)) {
      onChange?.(nextValue);
    }
  };

  const displayColor = useMemo(
    () => (isValidHex(hexInput) ? hexInput : normalizedValue),
    [hexInput, normalizedValue]
  );

  return (
    <div className="color-picker">
      <div className="color-picker__preview">
        <HexColorPicker color={displayColor} onChange={handlePickerChange} />
      </div>

      <div className="color-picker__controls">
        <div className="color-picker__swatch" style={{ backgroundColor: displayColor }} />
        <input
          type="text"
          className="color-picker__hex-input"
          value={hexInput}
          maxLength={7}
          onChange={handleHexInputChange}
        />
        <button type="button" className="color-picker__pipette" disabled>
          <Pipette size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
