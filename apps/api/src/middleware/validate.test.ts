import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "./validate.js";
import { ValidationError } from "../utils/errors.js";

function mockReq({ body, params, query }: {
  body?: unknown;
  params?: unknown;
  query?: unknown;
}) {
  return { body, params, query } as never;
}

function mockRes() {
  return {} as never;
}

describe("validate middleware", () => {
  it("llama a next() sin argumentos si el body es válido", () => {
    const schema = { body: z.object({ name: z.string() }) };
    const middleware = validate(schema);
    const req = mockReq({ body: { name: "ok" } });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(); // sin argumentos
  });

  it("sobreescribe req.body con el valor parseado (defaults aplicados)", () => {
    const schema = {
      body: z.object({
        currency: z.string().default("EUR"),
      }),
    };
    const middleware = validate(schema);
    const req = mockReq({ body: {} });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    expect((req as { body: { currency: string } }).body.currency).toBe("EUR");
  });

  it("llama a next(ValidationError) si el body es inválido", () => {
    const schema = { body: z.object({ name: z.string().min(3) }) };
    const middleware = validate(schema);
    const req = mockReq({ body: { name: "x" } });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("incluye detalles por campo en el ValidationError", () => {
    const schema = { body: z.object({ name: z.string().min(3) }) };
    const middleware = validate(schema);
    const req = mockReq({ body: { name: "" } });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    const err = next.mock.calls[0]?.[0] as ValidationError;
    expect(err.details).toBeDefined();
    expect(err.details?.name).toBeDefined();
  });

  it("valida params si se pasa un schema de params", () => {
    const schema = {
      params: z.object({ id: z.string().uuid() }),
    };
    const middleware = validate(schema);
    const req = mockReq({ params: { id: "no-uuid" } });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("valida query si se pasa un schema de query", () => {
    const schema = {
      query: z.object({ page: z.string().regex(/^\d+$/) }),
    };
    const middleware = validate(schema);
    const req = mockReq({ query: { page: "abc" } });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
  });

  it("acumula errores de body, params y query en un único ValidationError", () => {
    const schema = {
      body: z.object({ name: z.string().min(3) }),
      params: z.object({ id: z.string().uuid() }),
    };
    const middleware = validate(schema);
    const req = mockReq({
      body: { name: "x" },
      params: { id: "no-uuid" },
    });
    const next = vi.fn();
    middleware(req, mockRes(), next);
    const err = next.mock.calls[0]?.[0] as ValidationError;
    expect(Object.keys(err.details || {}).length).toBeGreaterThanOrEqual(2);
  });
});
