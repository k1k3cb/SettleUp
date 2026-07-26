import { Router } from "express";
import { expensesController } from "./expenses.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  groupIdParamSchema,
  expenseIdParamSchema,
  createExpenseSchema,
} from "./expenses.schemas.js";

/**
 * Este router NO se monta directamente. Está pensado para anidarse
 * bajo /groups/:groupId (en app.ts) para tener un :groupId estable
 * en todas las rutas. Las validaciones de params se aplican aquí.
 */
export const expensesRouter: Router = Router({ mergeParams: true });

expensesRouter.use(authenticate);

expensesRouter.get(
  "/",
  validate({ params: groupIdParamSchema }),
  expensesController.list,
);

expensesRouter.post(
  "/",
  validate({ params: groupIdParamSchema, body: createExpenseSchema }),
  expensesController.create,
);

expensesRouter.delete(
  "/:expenseId",
  validate({ params: expenseIdParamSchema }),
  expensesController.remove,
);
