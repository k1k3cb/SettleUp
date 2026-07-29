import { api } from "@/lib/api";
import type { GroupBalances } from "@/types/group";

export const balancesService = {
  get: (groupId: string) =>
    api<GroupBalances>("GET", `/groups/${groupId}/balances`),
};
