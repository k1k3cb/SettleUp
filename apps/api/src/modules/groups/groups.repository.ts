import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { groups, groupMembers } from "../../db/schema/index.js";
import type { CreateGroupInput, UpdateGroupInput } from "./groups.schemas.js";

export type Group = typeof groups.$inferSelect;

export class GroupsRepository {
  async findById(id: string): Promise<Group | null> {
    const [row] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    return row ?? null;
  }

  async findByInviteCode(inviteCode: string): Promise<Group | null> {
    const [row] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode))
      .limit(1);
    return row ?? null;
  }

  async listForUser(userId: string): Promise<Group[]> {
    const rows = await db
      .select({ g: groups })
      .from(groups)
      .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));
    return rows.map((r) => r.g);
  }

  async create(data: {
    name: string;
    createdBy: string;
    inviteCode: string;
  }): Promise<Group> {
    const [row] = await db
      .insert(groups)
      .values({
        name: data.name,
        createdBy: data.createdBy,
        inviteCode: data.inviteCode,
      })
      .returning();
    return row;
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    await db
      .insert(groupMembers)
      .values({ groupId, userId })
      .onConflictDoNothing();
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId),
        ),
      )
      .limit(1);
    return !!row;
  }

  async update(id: string, data: UpdateGroupInput): Promise<Group | null> {
    const [row] = await db
      .update(groups)
      .set(data)
      .where(eq(groups.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.delete(groups).where(eq(groups.id, id)).returning();
    return rows.length > 0;
  }
}
