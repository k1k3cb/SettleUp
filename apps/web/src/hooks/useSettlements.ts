import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settlementsService } from "@/services/settlements";
import type { Settlement, CreateSettlementInput } from "@/types/group";

export const settlementsKeys = {
  all: ["settlements"] as const,
  byGroup: (groupId: string) => [...settlementsKeys.all, groupId] as const,
};

export function useGroupSettlements(groupId: string | undefined) {
  return useQuery<Settlement[]>({
    queryKey: groupId
      ? settlementsKeys.byGroup(groupId)
      : settlementsKeys.all,
    queryFn: () => {
      if (!groupId) throw new Error("groupId is required");
      return settlementsService.list(groupId);
    },
    enabled: !!groupId,
  });
}

export function useCreateSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation<Settlement, Error, CreateSettlementInput>({
    mutationFn: (body) => {
      // eslint-disable-next-line no-console
      console.log("[mutationFn] creating settlement, groupId=", groupId, "body=", body);
      return settlementsService.create(groupId, body);
    },
    onSuccess: () => {
      // eslint-disable-next-line no-console
      console.log("[mutationFn] onSuccess");
      // Crear un settlement cambia balances y la lista de pagos.
      qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
      qc.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });
}

export function useDeleteSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (settlementId) =>
      settlementsService.cancel(groupId, settlementId),
    onSuccess: () => {
      // Cancelar un settlement también cambia balances y la lista.
      qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
      qc.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });
}
