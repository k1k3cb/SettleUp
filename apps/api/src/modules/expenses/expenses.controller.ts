import type { Request, Response } from "express";
import { ExpensesService } from "./expenses.service.js";
import { ExpensesRepository } from "./expenses.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UnauthorizedError } from "../../utils/errors.js";
import type { CreateExpenseInput } from "./expenses.schemas.js";

const expensesService = new ExpensesService(
  new ExpensesRepository(),
  new GroupsRepository(),
);

const requireUserId = (req: Request): string => {
  const userId = req.session?.user.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
};

export const expensesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const expenses = await expensesService.listByGroup(groupId, userId);
    return ApiResponse.success(res, expenses);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { groupId } = req.params as { groupId: string };
    const input = req.body as CreateExpenseInput;
    const expense = await expensesService.create(groupId, userId, input);
    return ApiResponse.created(res, expense);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireUserId(req);
    const { groupId, expenseId } = req.params as {
      groupId: string;
      expenseId: string;
    };
    await expensesService.softDelete(groupId, expenseId, userId);
    return ApiResponse.noContent(res);
  }),
};
