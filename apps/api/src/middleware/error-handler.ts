import type { ErrorRequestHandler } from "express";
import { AppError, ValidationError } from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      status: "error",
      message: err.message,
    };
    if (err instanceof ValidationError && err.details) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected error: log full, return generic in production
  console.error("[unhandled-error]", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;
  res.status(500).json({ status: "error", message });
};
