import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: obligatorio para que la app cargue bien
  // dentro del WebView de Capacitor (file://).
  base: "./",
});
