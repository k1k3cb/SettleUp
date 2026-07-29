import { api } from "@/lib/api";
import type { Settlement, CreateSettlementInput } from "@/types/group";

export const settlementsService = {
  list: (groupId: string) =>
    api<Settlement[]>("GET", `/groups/${groupId}/settlements`),

  create: (groupId: string, body: CreateSettlementInput) =>
    api<Settlement>("POST", `/groups/${groupId}/settlements`, body),

  cancel: (groupId: string, settlementId: string) =>
    api<void>("DELETE", `/groups/${groupId}/settlements/${settlementId}`),
};
