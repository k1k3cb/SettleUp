import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesService } from "@/services/expenses";
import { expensesKeys } from "./useCreateExpense";
import { balancesKeys } from "./useGroupBalances";
export function useCancelExpense(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (expenseId) => expensesService.remove(groupId, expenseId),
        onSuccess: () => {
            // Anular un gasto también cambia los balances.
            qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
            qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
        },
    });
}
