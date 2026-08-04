/**
 * Tests del hook `useGroupRealtime`. Cubren solo la rama de
 * polling, que es la que se usa en producción. La rama de
 * WebSocket se delega a Socket.IO y se testearía con un servidor
 * real, fuera de scope aquí.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGroupRealtime } from "./useGroupRealtime";
import type { ReactNode } from "react";

// @vitest-environment jsdom

const wsEnabledMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/env", () => ({
  wsEnabled: wsEnabledMock(),
  wsUrl: "http://localhost:4000",
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy, qc };
}

describe("useGroupRealtime (polling)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    wsEnabledMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("no inicia polling si groupId es undefined", () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    renderHook(() => useGroupRealtime(undefined), { wrapper });
    vi.advanceTimersByTime(60_000);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("invalida queries del grupo cada 15s", () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    renderHook(() => useGroupRealtime("group-1"), { wrapper });

    expect(invalidateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15_000);
    // 4 invalidations por tick: expenses, balances, settlements, members.
    expect(invalidateSpy).toHaveBeenCalledTimes(4);

    vi.advanceTimersByTime(15_000);
    expect(invalidateSpy).toHaveBeenCalledTimes(8);

    vi.advanceTimersByTime(15_000);
    expect(invalidateSpy).toHaveBeenCalledTimes(12);
  });

  it("incluye las 4 claves de query del grupo en cada tick", () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    renderHook(() => useGroupRealtime("group-42"), { wrapper });

    vi.advanceTimersByTime(15_000);

    // Recogemos los queryKeys invalidados.
    const keys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: readonly unknown[] }).queryKey,
    );

    // expenses, balances, settlements, members — en cualquier orden.
    const has = (prefix: string) =>
      keys.some(
        (k) =>
          Array.isArray(k) && k.includes(prefix) && k.includes("group-42"),
      );

    expect(has("expenses")).toBe(true);
    expect(has("balances")).toBe(true);
    expect(has("settlements")).toBe(true);
    expect(has("members")).toBe(true);
  });

  it("detiene el polling al desmontar", () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const { unmount } = renderHook(() => useGroupRealtime("group-1"), {
      wrapper,
    });

    vi.advanceTimersByTime(15_000);
    expect(invalidateSpy).toHaveBeenCalledTimes(4);

    unmount();
    vi.advanceTimersByTime(60_000);
    // El contador sigue en 4: no se han emitido más ticks.
    expect(invalidateSpy).toHaveBeenCalledTimes(4);
  });
});
