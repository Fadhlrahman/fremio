import { createContext, useContext, useMemo, useState } from "react";

const HeaderBrandingContext = createContext(null);

export function HeaderBrandingProvider({ children }) {
  const [branding, setBranding] = useState(null);

  const api = useMemo(() => {
    return {
      branding,
      setBranding,
      clearBranding: () => setBranding(null),
    };
  }, [branding]);

  return (
    <HeaderBrandingContext.Provider value={api}>
      {children}
    </HeaderBrandingContext.Provider>
  );
}

export function useHeaderBranding() {
  const value = useContext(HeaderBrandingContext);
  if (!value) {
    return {
      branding: null,
      setBranding: () => {},
      clearBranding: () => {},
    };
  }
  return value;
}
