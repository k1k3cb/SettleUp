import { api } from "@/lib/api";
export const balancesService = {
    get: (groupId) => api("GET", `/groups/${groupId}/balances`),
};
