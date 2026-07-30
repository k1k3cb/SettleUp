import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "./asyncHandler.js";

describe("asyncHandler", () => {
  it("pasa el control a next() si el handler resuelve", async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.json({ ok: true });
    });
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();
    await handler(req as never, res as never, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it("pasa errores a next() si el handler rechaza", async () => {
    const handler = asyncHandler(async () => {
      throw new Error("boom");
    });
    const req = {};
    const res = {};
    const next = vi.fn();
    await handler(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("boom");
  });
});
