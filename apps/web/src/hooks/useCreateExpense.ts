import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  expensesService,
  type CreateExpenseInput,
  type ExpenseWithSplits,
} from "@/services/expenses";

export const expensesKeys = {
  all: ["expenses"] as const,
  byGroup: (groupId: string) => [...expensesKeys.all, groupId] as const,
};

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation<ExpenseWithSplits, Error, CreateExpenseInput>({
    mutationFn: (body) => expensesService.create(groupId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
    },
  });
}
