import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * MaintenanceGate - Component to check maintenance mode
 * Redirects users to /maintenance page if maintenance is enabled
 * Exempts admin users and whitelisted IPs
 */
export default function MaintenanceGate({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    checkMaintenanceStatus();
  }, [location.pathname]);

  const getMaintenanceApiBase = () => {
    const raw = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    // If VITE_API_URL already includes trailing /api (e.g. https://api.fremio.id/api),
    // do NOT prepend another /api.
    if (raw.endsWith("/api")) return { base: raw, prefix: "" };
    return { base: raw, prefix: "/api" };
  };

  const checkMaintenanceStatus = async () => {
    // Skip check if already on maintenance page
    if (location.pathname === "/maintenance") {
      setIsChecking(false);
      return;
    }

    try {
      const { base, prefix } = getMaintenanceApiBase();
      const response = await fetch(`${base}${prefix}/maintenance/status`);
      const data = await response.json();

      if (data.success && data.enabled) {
        // Check if user is admin (exempt from maintenance)
        if (user && user.role === "admin") {
          console.log("[MaintenanceGate] Admin user - bypassing maintenance");
          setMaintenanceEnabled(false);
        } else {
          console.log("[MaintenanceGate] Maintenance enabled - redirecting");
          setMaintenanceEnabled(true);
          navigate("/maintenance", { replace: true });
        }
      } else {
        setMaintenanceEnabled(false);
      }
    } catch (error) {
      console.error("[MaintenanceGate] Error checking maintenance:", error);
      // If error, allow access (fail-open for better UX)
      setMaintenanceEnabled(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Show nothing while checking (prevent flash)
  if (isChecking) {
    return null;
  }

  // If maintenance is enabled and not on maintenance page, show nothing
  // (navigation will happen)
  if (maintenanceEnabled && location.pathname !== "/maintenance") {
    return null;
  }

  return children;
}
