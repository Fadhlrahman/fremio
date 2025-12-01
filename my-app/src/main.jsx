import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// App version for debugging cache issues
console.log('🚀 Fremio App v13 - Build: 2025-12-01T07:30');

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      basename={(import.meta.env.BASE_URL || "/").replace(/\/+$/, "/")}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
