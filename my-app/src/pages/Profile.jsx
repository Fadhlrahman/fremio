import { useAuth } from "../contexts/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();
  return (
    <section className="container pad">
      <h2 style={{ marginBottom: 8 }}>Your Profile</h2>
      <p>
        Email: <b>{user?.email}</b>
      </p>
      <p>
        Name: <b>{user?.name || "-"}</b>
      </p>
    </section>
  );
}
