import { useQuery } from "@tanstack/react-query";
import { expensesService } from "@/services/expenses";
import { expensesKeys } from "./useCreateExpense";
export function useGroupExpenses(groupId) {
    return useQuery({
        queryKey: groupId ? expensesKeys.byGroup(groupId) : expensesKeys.all,
        queryFn: () => {
            if (!groupId)
                throw new Error("groupId is required");
            return expensesService.list(groupId);
        },
        enabled: !!groupId,
    });
}
