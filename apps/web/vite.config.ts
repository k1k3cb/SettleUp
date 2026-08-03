import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Playwright core hace `process.env` al cargar. En el
    // Vitest browser environment `process` no existe por defecto;
    // este define lo inyecta globalmente.
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@settleup/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@settleup/shared/auth": path.resolve(__dirname, "../../packages/shared/src/auth.ts"),
      // Playwright detecta el uso de Negotiate proxy auth y hace un
      // dynamic import a `kerberos`. En este entorno no tenemos el
      // paquete real (requiere compilación nativa). Lo resolvemos
      // contra un stub local para que la import no falle.
      "kerberos": path.resolve(__dirname, "./tests/stubs/kerberos/index.cjs"),
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
    // Tests E2E con Chromium real. Se seleccionan con el comentario
    // `// @vitest-environment playwright` en la primera línea del
    // archivo. headless:true corre sin ventana visible (CI-friendly).
    //
    // Importante: hay un problema conocido entre Vitest browser y
    // Playwright en este entorno (kerberos resolution). Para no romper
    // la suite jsdom, los tests E2E se excluyen aquí y se ejecutan
    // manualmente con `pnpm test:e2e` cuando el setup esté listo.
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        {
          browser: "chromium",
          headless: true,
        },
      ],
    },
  },
});
