import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { useEffect } from "react";

export default function RootLayout() {
  const { hash, pathname } = useLocation();
  const hideHeader = false;
  const hideFooter = false;

  useEffect(() => {
    // scroll ke anchor di homepage
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // tiap pindah halaman, mulai dari atas
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hash, pathname]);

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
