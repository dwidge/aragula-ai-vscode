import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/chatview",
    rollupOptions: {
      output: {
        entryFileNames: `assets/main.js`,
        chunkFileNames: `assets/main.js`,
        assetFileNames: `assets/style.css`,
      },
    },
  },
});
