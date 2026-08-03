import { api } from "@/lib/api";
export const groupsService = {
    list: () => api("GET", "/groups"),
    get: (id) => api("GET", `/groups/${id}`),
    create: (name) => api("POST", "/groups", { name }),
    join: (inviteCode) => api("POST", "/groups/join", { inviteCode }),
    listMembers: (id) => api("GET", `/groups/${id}/members`),
    getBalances: (id) => api("GET", `/groups/${id}/balances`),
};
