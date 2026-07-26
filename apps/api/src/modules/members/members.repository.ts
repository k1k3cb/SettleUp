import { eq, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { groupMembers, user } from "../../db/schema/index.js";

export type GroupMember = {
  userId: string;
  name: string;
  joinedAt: Date;
};

export class MembersRepository {
  async listByGroup(groupId: string): Promise<GroupMember[]> {
    const rows = await db
      .select({
        userId: groupMembers.userId,
        name: user.name,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(user, eq(user.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(asc(groupMembers.joinedAt));
    return rows;
  }
}
