import { api } from "@/lib/api";

export type GroupMember = {
  userId: string;
  name: string;
  joinedAt: string;
};

export const membersService = {
  list: (groupId: string) =>
    api<GroupMember[]>("GET", `/groups/${groupId}/members`),
};
