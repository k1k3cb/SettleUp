import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesService, } from "@/services/expenses";
import { balancesKeys } from "./useGroupBalances";
export const expensesKeys = {
    all: ["expenses"],
    byGroup: (groupId) => [...expensesKeys.all, groupId],
};
export function useCreateExpense(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body) => expensesService.create(groupId, body),
        onSuccess: () => {
            // Crear un gasto cambia los balances del grupo: invalidar también
            // la query de saldos para que la UI se actualice automáticamente.
            qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
            qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
        },
    });
}
