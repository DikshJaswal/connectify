import { build } from "vite";

await build({
  configFile: false,
  root: process.cwd(),
  base: "./",
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true
  }
});
