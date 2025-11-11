import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/chatview-react",
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist/chatview"),
    rollupOptions: {
      output: {
        entryFileNames: `assets/main.js`,
        chunkFileNames: `assets/main.js`,
        assetFileNames: `assets/style.css`,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.ts",
  },
});
