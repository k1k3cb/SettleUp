import { api } from "@/lib/api";
export const settlementsService = {
    list: (groupId) => api("GET", `/groups/${groupId}/settlements`),
    create: (groupId, body) => api("POST", `/groups/${groupId}/settlements`, body),
    cancel: (groupId, settlementId) => api("DELETE", `/groups/${groupId}/settlements/${settlementId}`),
};
