import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./routes";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/geist";
import "./styles/index.css" with { type: "css" };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
