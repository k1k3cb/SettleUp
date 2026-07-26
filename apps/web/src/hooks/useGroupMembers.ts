import { useQuery } from "@tanstack/react-query";
import { membersService, type GroupMember } from "@/services/members";

export const membersKeys = {
  all: ["members"] as const,
  byGroup: (groupId: string) => [...membersKeys.all, groupId] as const,
};

export function useGroupMembers(groupId: string | undefined) {
  return useQuery<GroupMember[]>({
    queryKey: groupId ? membersKeys.byGroup(groupId) : membersKeys.all,
    queryFn: () => {
      if (!groupId) throw new Error("groupId is required");
      return membersService.list(groupId);
    },
    enabled: !!groupId,
  });
}
