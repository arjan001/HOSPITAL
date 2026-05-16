import { monitoring } from "./lib/monitoring";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

monitoring.init({
  endpoint: "/api/v2/monitoring/events",
  release: "her-kingdom@" + (import.meta.env.MODE ?? "dev"),
});
