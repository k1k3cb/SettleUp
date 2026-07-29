import { useQuery } from "@tanstack/react-query";
import { balancesService } from "@/services/balances";
import type { GroupBalances } from "@/types/group";

export const balancesKeys = {
  all: ["balances"] as const,
  byGroup: (groupId: string) => [...balancesKeys.all, groupId] as const,
};

export function useGroupBalances(groupId: string | undefined) {
  return useQuery<GroupBalances>({
    queryKey: groupId ? balancesKeys.byGroup(groupId) : balancesKeys.all,
    queryFn: () => {
      if (!groupId) throw new Error("groupId is required");
      return balancesService.get(groupId);
    },
    enabled: !!groupId,
  });
}
