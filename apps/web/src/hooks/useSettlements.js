import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settlementsService } from "@/services/settlements";
export const settlementsKeys = {
    all: ["settlements"],
    byGroup: (groupId) => [...settlementsKeys.all, groupId],
};
export function useGroupSettlements(groupId) {
    return useQuery({
        queryKey: groupId
            ? settlementsKeys.byGroup(groupId)
            : settlementsKeys.all,
        queryFn: () => {
            if (!groupId)
                throw new Error("groupId is required");
            return settlementsService.list(groupId);
        },
        enabled: !!groupId,
    });
}
export function useCreateSettlement(groupId) {
    const qc = useQueryClient();
    return useMutation({
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
export function useDeleteSettlement(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (settlementId) => settlementsService.cancel(groupId, settlementId),
        onSuccess: () => {
            // Cancelar un settlement también cambia balances y la lista.
            qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
            qc.invalidateQueries({ queryKey: ["balances", groupId] });
        },
    });
}
