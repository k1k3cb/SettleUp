import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";
import { ValidationError } from "../utils/errors.js";

type Source = "body" | "params" | "query";

type ValidationSchema = {
  [K in Source]?: ZodTypeAny;
};

export const validate = (schema: ValidationSchema): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const details: Record<string, string[]> = {};
    const safe: Record<Source, unknown> = {
      body: req.body,
      params: req.params,
      query: req.query,
    };

    for (const source of ["body", "params", "query"] as const) {
      const parser = schema[source];
      if (!parser) continue;
      const result = parser.safeParse(safe[source]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path.join(".") || source;
          if (!details[key]) details[key] = [];
          details[key].push(issue.message);
        }
        continue;
      }
      // Sobrescribir req[source] con el valor parseado (p. ej. defaults aplicados)
      (req as unknown as Record<string, unknown>)[source] = result.data;
    }

    if (Object.keys(details).length > 0) {
      next(new ValidationError("Validation failed", details));
      return;
    }
    next();
  };
};

// Helper para inferir tipos del schema
export type Infer<S extends ValidationSchema> = {
  body: S extends { body: ZodTypeAny } ? z.infer<S["body"]> : undefined;
  params: S extends { params: ZodTypeAny } ? z.infer<S["params"]> : undefined;
  query: S extends { query: ZodTypeAny } ? z.infer<S["query"]> : undefined;
};
