import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

export default function RootLayout() {
  const location = useLocation();
  const normalizePath = (path) => {
    if (path === "/") return path;
    if (!path) return "/";
    return path.endsWith("/") && path !== "/" ? path.replace(/\/+$/, "") : path;
  };
  const currentPath = normalizePath(location.pathname || "/");
  const hideHeader = currentPath === "/take-moment";
  const hideFooter = currentPath === "/take-moment";

  return (
    <div className="app-shell">
      {!hideHeader && <Header />}
      <main className="app-main">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
