import { useQuery } from "@tanstack/react-query";
import { membersService } from "@/services/members";
export const membersKeys = {
    all: ["members"],
    byGroup: (groupId) => [...membersKeys.all, groupId],
};
export function useGroupMembers(groupId) {
    return useQuery({
        queryKey: groupId ? membersKeys.byGroup(groupId) : membersKeys.all,
        queryFn: () => {
            if (!groupId)
                throw new Error("groupId is required");
            return membersService.list(groupId);
        },
        enabled: !!groupId,
    });
}
