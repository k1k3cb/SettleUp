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

  /**
   * Devuelve un mapa userId → name para resolver nombres en otros
   * contextos (balances, expenses). Una sola query, sin JOIN doble.
   */
  async nameMap(groupId: string): Promise<Record<string, string>> {
    const members = await this.listByGroup(groupId);
    return Object.fromEntries(members.map((m) => [m.userId, m.name]));
  }
}
