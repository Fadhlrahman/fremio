import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Reusable Back Button for Admin Pages
 * Navigates back to Admin Dashboard
 */
export default function AdminBackButton({ className = "", style = {} }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/admin")}
      className={`admin-button-secondary ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "16px",
        padding: "10px 16px",
        ...style,
      }}
    >
      <ArrowLeft size={18} />
      Kembali ke Dashboard
    </button>
  );
}
