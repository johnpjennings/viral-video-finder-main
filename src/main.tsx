import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

// Fail fast if the root element is missing, rather than rendering into null.
if (!rootElement) {
  throw new Error("Root element '#root' not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
