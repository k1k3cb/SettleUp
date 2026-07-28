import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./auth.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { membersRouter } from "./modules/members/members.routes.js";
import { balancesRouter } from "./modules/balances/balances.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  // CORS antes de todo: el cliente Vite está en otro origen.
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );

  // Better Auth: solo en su prefijo. El handler no llama a next() y
  // bloquearía el resto de rutas si se monta globalmente.
  app.use(authRouter);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "settleup-api" });
  });

  // Rutas de la app
  app.use("/groups", groupsRouter);
  // Anidado bajo /groups para tener :groupId en todas las rutas de expenses.
  // mergeParams en el router de expenses lo hace accesible.
  app.use("/groups/:groupId/expenses", expensesRouter);
  app.use("/groups/:groupId/members", membersRouter);
  app.use("/groups/:groupId/balances", balancesRouter);

  // Error handler global al final
  app.use(errorHandler);

  return app;
}
