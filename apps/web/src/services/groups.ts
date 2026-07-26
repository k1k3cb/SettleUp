import { api } from "@/lib/api";
import type { Group } from "@/types/group";

export type GroupDetail = Group;

export const groupsService = {
  list: () => api<Group[]>("GET", "/groups"),

  get: (id: string) => api<GroupDetail>("GET", `/groups/${id}`),

  create: (name: string) =>
    api<Group>("POST", "/groups", { name }),

  join: (inviteCode: string) =>
    api<Group>("POST", "/groups/join", { inviteCode }),
};
