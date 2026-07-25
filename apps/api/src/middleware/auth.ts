import type { Request, Response, NextFunction, RequestHandler } from "express";
import { auth } from "../auth.js";
import { UnauthorizedError } from "../utils/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: {
        user: { id: string; email: string; name: string };
        session: { id: string; token: string; expiresAt: Date };
      };
    }
  }
}

/**
 * Convierte IncomingHttpHeaders de Node al formato HeadersInit que espera
 * la fetch API usada por Better Auth.
 */
const toHeadersInit = (headers: Request["headers"]): HeadersInit => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return out;
};

/**
 * Lee la sesión de Better Auth a partir de las cookies de la request.
 * Popula `req.session` o lanza 401.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: toHeadersInit(req.headers),
    });
    if (!session) {
      throw new UnauthorizedError("Not authenticated");
    }
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
};
