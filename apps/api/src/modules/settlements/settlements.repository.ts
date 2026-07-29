import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { settlements } from "../../db/schema/index.js";

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;

export class SettlementsRepository {
  /**
   * Crea un settlement ya confirmado (modelo "pago directo").
   * El service es responsable de validar membership y fromUser antes
   * de llamar a este método.
   */
  async createConfirmed(data: {
    groupId: string;
    fromUser: string;
    toUser: string;
    amountCents: number;
  }): Promise<Settlement> {
    const [row] = await db
      .insert(settlements)
      .values({
        groupId: data.groupId,
        fromUser: data.fromUser,
        toUser: data.toUser,
        amountCents: data.amountCents,
        status: "confirmed",
        confirmedAt: new Date(),
      })
      .returning();
    return row;
  }

  /**
   * Lista los settlements confirmados de un grupo, ordenados por fecha desc.
   */
  async listByGroup(groupId: string): Promise<Settlement[]> {
    return db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.groupId, groupId),
          eq(settlements.status, "confirmed"),
        ),
      )
      .orderBy(desc(settlements.confirmedAt));
  }
}
