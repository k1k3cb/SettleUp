import { api } from "@/lib/api";
export const expensesService = {
    list: (groupId) => api("GET", `/groups/${groupId}/expenses`),
    create: (groupId, body) => api("POST", `/groups/${groupId}/expenses`, body),
    remove: (groupId, expenseId) => api("DELETE", `/groups/${groupId}/expenses/${expenseId}`),
};
