import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import "@/index.css";
import App from "@/App";

// Clerk publishable key - set on window to survive webpack DefinePlugin
const pk = window.__CLERK_PK || "pk_test_c2VjdXJlLWRvYmVybWFuLTkzLmNsZXJrLmFjY291bnRzLmRldiQ";

console.log("[Clerk] Using publishable key:", pk?.substring(0, 20) + "...");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={pk} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);
