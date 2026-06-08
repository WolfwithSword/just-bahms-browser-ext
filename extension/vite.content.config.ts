import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        content: "src/content.ts",
      },
      output: {
        inlineDynamicImports: true,
        entryFileNames: "content.js", // Forces simple names: background.js, content.js
      },
    },
  },
});
