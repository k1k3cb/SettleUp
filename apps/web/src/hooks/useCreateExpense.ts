import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  expensesService,
  type CreateExpenseInput,
  type ExpenseWithSplits,
} from "@/services/expenses";
import { balancesKeys } from "./useGroupBalances";

export const expensesKeys = {
  all: ["expenses"] as const,
  byGroup: (groupId: string) => [...expensesKeys.all, groupId] as const,
};

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation<ExpenseWithSplits, Error, CreateExpenseInput>({
    mutationFn: (body) => expensesService.create(groupId, body),
    onSuccess: () => {
      // Crear un gasto cambia los balances del grupo: invalidar también
      // la query de saldos para que la UI se actualice automáticamente.
      qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
      qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
    },
  });
}
