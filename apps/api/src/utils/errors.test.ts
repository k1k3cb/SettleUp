import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "./errors.js";

describe("AppError", () => {
  it("crea con status 500 por defecto", () => {
    const err = new AppError("algo falló");
    expect(err.message).toBe("algo falló");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("acepta status code custom", () => {
    const err = new AppError("custom", 418);
    expect(err.statusCode).toBe(418);
  });

  it("preserva el stack trace", () => {
    const err = new AppError("x");
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
    // El stack incluye el mensaje
    expect(err.stack).toContain("x");
  });
});

describe("Errores específicos", () => {
  it("ValidationError → 400", () => {
    const err = new ValidationError("datos malos");
    expect(err.statusCode).toBe(400);
    expect(err).toBeInstanceOf(AppError);
  });

  it("ValidationError acepta details", () => {
    const err = new ValidationError("datos malos", { email: ["requerido"] });
    expect(err.details).toEqual({ email: ["requerido"] });
  });

  it("UnauthorizedError → 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it("ForbiddenError → 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("NotFoundError → 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it("ConflictError → 409", () => {
    expect(new ConflictError("ya existe").statusCode).toBe(409);
  });
});
