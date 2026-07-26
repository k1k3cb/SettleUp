import { api } from "@/lib/api";

export type ExpenseSplit = {
  id: string;
  expenseId: string;
  userId: string;
  owedAmountCents: number;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  currency: string;
  paidBy: string;
  splitMethod: "equal" | "exact" | "percentage";
  isCancelled: boolean;
  createdAt: string;
};

export type ExpenseWithSplits = Expense & { splits: ExpenseSplit[] };

export type CreateExpenseEqualInput = {
  description: string;
  amountCents: number;
  currency?: string;
  paidBy: string;
  splitMethod: "equal";
  splits: Array<{ userId: string }>;
};

export type CreateExpenseExactInput = {
  description: string;
  amountCents: number;
  currency?: string;
  paidBy: string;
  splitMethod: "exact";
  splits: Array<{ userId: string; amountCents: number }>;
};

export type CreateExpensePercentageInput = {
  description: string;
  amountCents: number;
  currency?: string;
  paidBy: string;
  splitMethod: "percentage";
  splits: Array<{ userId: string; percentage: number }>;
};

export type CreateExpenseInput =
  | CreateExpenseEqualInput
  | CreateExpenseExactInput
  | CreateExpensePercentageInput;

export const expensesService = {
  list: (groupId: string) =>
    api<ExpenseWithSplits[]>("GET", `/groups/${groupId}/expenses`),

  create: (groupId: string, body: CreateExpenseInput) =>
    api<ExpenseWithSplits>("POST", `/groups/${groupId}/expenses`, body),
};
