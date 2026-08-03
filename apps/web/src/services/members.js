import { api } from "@/lib/api";
export const membersService = {
    list: (groupId) => api("GET", `/groups/${groupId}/members`),
};
