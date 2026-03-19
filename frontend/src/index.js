import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import "@/index.css";
import App from "@/App";

// Clerk publishable key — reads from window (set in index.html) or env at build time
const pk = window.__CLERK_PK || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || "";

if (!pk) {
  document.getElementById("root").innerHTML = '<div style="padding:40px;font-family:sans-serif"><h2>Configuration Error</h2><p>CLERK_PK not set. Check index.html or .env</p></div>';
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={pk} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);
