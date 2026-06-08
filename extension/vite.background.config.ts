import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        background: "src/background.ts",
      },
      output: {
        entryFileNames: "[name].js", // Forces simple names: background.js, content.js
      },
    },
    emptyOutDir: false,
  },
});
