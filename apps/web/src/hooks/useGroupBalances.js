import { useQuery } from "@tanstack/react-query";
import { balancesService } from "@/services/balances";
export const balancesKeys = {
    all: ["balances"],
    byGroup: (groupId) => [...balancesKeys.all, groupId],
};
export function useGroupBalances(groupId) {
    return useQuery({
        queryKey: groupId ? balancesKeys.byGroup(groupId) : balancesKeys.all,
        queryFn: () => {
            if (!groupId)
                throw new Error("groupId is required");
            return balancesService.get(groupId);
        },
        enabled: !!groupId,
    });
}
