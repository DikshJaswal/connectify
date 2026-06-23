import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  envDir: __dirname,
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [resolve(__dirname, "..", "..")]
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true
  }
});
