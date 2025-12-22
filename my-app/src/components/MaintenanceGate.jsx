import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * MaintenanceGate - Component to check maintenance mode
 * Redirects users to /maintenance page if maintenance is enabled
 * Exempts admin users and whitelisted IPs
 */
export default function MaintenanceGate({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAlwaysAllowedPath = (pathname) => {
    // Always allow auth + maintenance pages (even during maintenance),
    // including trailing slashes and nested auth paths.
    return (
      pathname === "/maintenance" ||
      pathname.startsWith("/maintenance/") ||
      pathname === "/login" ||
      pathname.startsWith("/login/") ||
      pathname === "/register" ||
      pathname.startsWith("/register/") ||
      pathname === "/reset-password" ||
      pathname.startsWith("/reset-password/")
    );
  };

  const [isChecking, setIsChecking] = useState(() => !isAlwaysAllowedPath(location.pathname));
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  useEffect(() => {
    // Reset state per navigation.
    if (isAlwaysAllowedPath(location.pathname)) {
      setMaintenanceEnabled(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
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
    try {
      const { base, prefix } = getMaintenanceApiBase();
      const response = await fetch(`${base}${prefix}/maintenance/status`);
      const data = await response.json();

      if (data.success && data.enabled) {
        // Admin users can always bypass maintenance
        if (user && user.role === "admin") {
          setMaintenanceEnabled(false);
          return;
        }

        // If user has a token (logged in), check whether they are whitelisted
        const token =
          localStorage.getItem("fremio_token") ||
          localStorage.getItem("auth_token");
        if (token) {
          try {
            const accessRes = await fetch(`${base}${prefix}/maintenance/access`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const accessData = await accessRes.json();
            if (accessData?.success && accessData?.allowed) {
              setMaintenanceEnabled(false);
              return;
            }
          } catch (_) {
            // fallthrough to redirect
          }
        }

        // Not allowed → redirect to maintenance page
        setMaintenanceEnabled(true);
        navigate("/maintenance", { replace: true });
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
