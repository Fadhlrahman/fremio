import { NavLink } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="container pad center">
      <h2>404 — Halaman tidak ditemukan</h2>
      <NavLink to="/" className="btn">
        Kembali ke Home
      </NavLink>
    </section>
  );
}
