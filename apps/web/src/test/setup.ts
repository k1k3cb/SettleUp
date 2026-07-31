/**
 * Setup global para tests de Vitest. Carga antes de cada archivo
 * de test. Aquí se importan matchers de Testing Library, se mockean
 * APIs del navegador (clipboard, scrollIntoView, ResizeObserver) y
 * se prepara lo que JSDOM no implementa por defecto.
 *
 * Los tests que renderizan componentes React usan
 * `// @vitest-environment jsdom` en su primera línea.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// JSDOM no implementa clipboard; lo mockeamos para que los handlers
// de "Copiar código" no fallen en tests. El check `typeof navigator`
// evita ReferenceError en tests en entorno node.
if (typeof navigator !== "undefined" && !("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
} else if (typeof navigator !== "undefined") {
  vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
}

// JSDOM no implementa scrollIntoView; algunos componentes (Dialog,
// Sheet) lo llaman al abrir. Sin este mock, JSDOM lanza "Not
// implemented: HTMLDivElement.scrollIntoView".
if (
  typeof Element !== "undefined" &&
  Element.prototype &&
  !Element.prototype.scrollIntoView
) {
  Element.prototype.scrollIntoView = function () {
    /* no-op */
  };
}

// JSDOM no implementa ResizeObserver; algunos componentes de shadcn
// (Popover, Tabs) lo usan internamente.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  } as unknown as typeof ResizeObserver;
}

// JSDOM no implementa matchMedia; algunos componentes lo usan.
// Importante: comprobar primero si `window` existe (en node no),
// antes de tocar `window.matchMedia` — si no, el acceso a `window`
// lanza ReferenceError aunque esté dentro de un `typeof`.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {
      /* no-op */
    },
    removeListener: () => {
      /* no-op */
    },
    addEventListener: () => {
      /* no-op */
    },
    removeEventListener: () => {
      /* no-op */
    },
    dispatchEvent: () => false,
  });
}

// Testing Library: limpia el DOM renderizado entre tests.
afterEach(() => {
  cleanup();
});
