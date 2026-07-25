import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

export const authRouter: Router = Router();

// El handler de Better Auth responde siempre (no llama a next()), por lo
// que debe montarse solo en su prefijo. Si lo montamos en raíz con
// `app.use()`, intercepta el resto de rutas con 404.
authRouter.all("/api/auth/*splat", toNodeHandler(auth));
