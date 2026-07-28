import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesService } from "@/services/expenses";
import { expensesKeys } from "./useCreateExpense";

export function useCancelExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (expenseId) => expensesService.remove(groupId, expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
    },
  });
}
