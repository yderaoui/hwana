import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/outfit";
import App from "./App";
import ElkoPacksLanding from "./ElkoPacksLanding";
import "./styles.css";

const pathname = window.location.pathname.replace(/\/+$/, "");
const Root = pathname === "/elko-packs" ? ElkoPacksLanding : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
