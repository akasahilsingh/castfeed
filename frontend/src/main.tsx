import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./style.css";
import App from "./App";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#f1f1f1",
            border: "1px solid #2e2e2e",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
