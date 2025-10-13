import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // load dari localStorage biar persist antar refresh
  useEffect(() => {
    const raw = localStorage.getItem("fremio:user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = (payload) => {
    // payload minimal: { email, name }
    setUser(payload);
    localStorage.setItem("fremio:user", JSON.stringify(payload));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fremio:user");
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
