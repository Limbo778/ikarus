import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrandTelegram } from "./components/ui/brand-telegram";

// Lazy load the brand telegram component
// This is a workaround since we can't import directly as a binary file
const Component = {
  BrandTelegram
};

createRoot(document.getElementById("root")!).render(<App />);
