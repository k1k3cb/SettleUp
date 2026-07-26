import { useQuery } from "@tanstack/react-query";
import { expensesService, type ExpenseWithSplits } from "@/services/expenses";
import { expensesKeys } from "./useCreateExpense";

export function useGroupExpenses(groupId: string | undefined) {
  return useQuery<ExpenseWithSplits[]>({
    queryKey: groupId ? expensesKeys.byGroup(groupId) : expensesKeys.all,
    queryFn: () => {
      if (!groupId) throw new Error("groupId is required");
      return expensesService.list(groupId);
    },
    enabled: !!groupId,
  });
}
