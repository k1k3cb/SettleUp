import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@settleup/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@settleup/shared/auth": path.resolve(__dirname, "../../packages/shared/src/auth.ts"),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    // Por defecto los tests corren en entorno node (rápidos). Los
    // tests que renderizan componentes de React usan `jsdom`, y se
    // seleccionan con el comentario `// @vitest-environment jsdom`
    // en la primera línea del archivo.
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
  },
});
