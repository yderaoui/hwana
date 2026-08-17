import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 4173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf("node_modules/gsap") !== -1) return "motion";
          if (id.indexOf("node_modules/@phosphor-icons") !== -1) return "icons";
          if (id.indexOf("node_modules/react") !== -1) return "react";
        },
      },
    },
  },
});
