import { and, eq, inArray, sum } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  settlements,
} from "../../db/schema/index.js";
import type { CreateGroupInput, UpdateGroupInput } from "./groups.schemas.js";

export type Group = typeof groups.$inferSelect;

/**
 * Grupo con el flag `isSettled` calculado para un usuario concreto.
 * `isSettled` significa: el balance neto del `viewerUserId` en este
 * grupo es 0 (ni debe ni le deben). Es una vista personal, no un
 * estado global del grupo. Un grupo puede estar `isSettled: true`
 * para un miembro y `false` para otro simultáneamente.
 */
export type GroupWithSettlement = Group & { isSettled: boolean };

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

  /**
   * Lista los grupos del usuario con un flag `isSettled` por grupo.
   *
   * `isSettled` se calcula para el **grupo entero**: un grupo está
   * saldado si **todos** sus miembros tienen balance 0 (o equivalentemente,
   * no hay transferencias pendientes después del `debtSimplifier`).
   * Esta es la misma semántica que `BalancesService.getGroupBalances.isSettled`,
   * para que la lista y la página de detalle cuenten la misma historia.
   *
   * Implementación: 4 queries agregadas en paralelo, una por término del
   * balance, agrupadas por `(groupId, userId)`. Coste: O(1) queries
   * totales para N grupos del usuario. Comparado con N+1 (llamar a
   * balances por cada grupo), es O(1) vs O(N).
   *
   * Fórmula del balance (por usuario, por grupo):
   *   +SUM(expenses WHERE paidBy=user)
   *   -SUM(expenseSplits WHERE userId=user)
   *   -SUM(settlements WHERE fromUser=user, confirmed)
   *   +SUM(settlements WHERE toUser=user, confirmed)
   */
  async listForUser(userId: string): Promise<GroupWithSettlement[]> {
    const rows = await db
      .select({ g: groups })
      .from(groups)
      .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));
    const myGroups = rows.map((r) => r.g);
    if (myGroups.length === 0) return [];

    const groupIds = myGroups.map((g) => g.id);

    // 4 queries agregadas en paralelo. Cada una devuelve filas
    // `{ groupId, userId, total }`. Sumamos por (groupId, userId) y
    // luego, para cada grupo, comprobamos si todos los totales son 0.
    const [paid, owed, settledFrom, settledTo] = await Promise.all([
      db
        .select({
          groupId: expenses.groupId,
          userId: expenses.paidBy,
          total: sum(expenses.amountCents),
        })
        .from(expenses)
        .where(
          and(
            inArray(expenses.groupId, groupIds),
            eq(expenses.isCancelled, false),
          ),
        )
        .groupBy(expenses.groupId, expenses.paidBy),

      db
        .select({
          groupId: expenses.groupId,
          userId: expenseSplits.userId,
          total: sum(expenseSplits.owedAmountCents),
        })
        .from(expenseSplits)
        .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
        .where(
          and(
            inArray(expenses.groupId, groupIds),
            eq(expenses.isCancelled, false),
          ),
        )
        .groupBy(expenses.groupId, expenseSplits.userId),

      db
        .select({
          groupId: settlements.groupId,
          userId: settlements.fromUser,
          total: sum(settlements.amountCents),
        })
        .from(settlements)
        .where(
          and(
            inArray(settlements.groupId, groupIds),
            eq(settlements.status, "confirmed"),
          ),
        )
        .groupBy(settlements.groupId, settlements.fromUser),

      db
        .select({
          groupId: settlements.groupId,
          userId: settlements.toUser,
          total: sum(settlements.amountCents),
        })
        .from(settlements)
        .where(
          and(
            inArray(settlements.groupId, groupIds),
            eq(settlements.status, "confirmed"),
          ),
        )
        .groupBy(settlements.groupId, settlements.toUser),
    ]);

    // Acumular por (groupId, userId) con su signo.
    type Key = string; // `${groupId}::${userId}`
    const balance = new Map<Key, number>();
    const add = (
      rows: { groupId: string; userId: string; total: string | number | null }[],
      sign: 1 | -1,
    ) => {
      for (const r of rows) {
        if (r.total == null) continue;
        const cents = typeof r.total === "string" ? parseInt(r.total, 10) : r.total;
        if (!Number.isFinite(cents)) continue;
        const key: Key = `${r.groupId}::${r.userId}`;
        balance.set(key, (balance.get(key) ?? 0) + sign * cents);
      }
    };
    add(paid, 1);
    add(owed, -1);
    add(settledFrom, -1);
    add(settledTo, 1);

    // Conjunto de usuarios que tienen **alguna** participación en
    // el grupo (pagaron, deben, liquidaron). Si un usuario tiene
    // balance 0 y no aparece en ninguna de las 4 queries, no
    // afecta a la decisión: por invariante del sistema, su
    // balance es 0 (nunca pagó, nunca debió, nunca liquidó).
    // Para saber "el grupo está saldado", basta con que ningún
    // usuario con balance distinto de 0 exista.
    //
    // Pero hay un caso: un usuario que **solo** está como miembro
    // sin gastos ni settlements, su balance es 0, y no aparece
    // en ninguna fila. No lo contamos como "desbalance" porque
    // no lo es. La condición es: NO existe ningún usuario con
    // balance != 0.
    const nonZeroKeys = new Set<Key>();
    for (const [key, value] of balance) {
      if (value !== 0) nonZeroKeys.add(key);
    }

    const settledByGroup = new Set<string>();
    // Inicialmente, todos los grupos del usuario están potencialmente
    // saldados. Se excluyen si encontramos un usuario con balance != 0.
    for (const g of myGroups) settledByGroup.add(g.id);
    for (const key of nonZeroKeys) {
      const [groupId] = key.split("::");
      if (groupId) settledByGroup.delete(groupId);
    }

    return myGroups.map((g) => ({
      ...g,
      isSettled: settledByGroup.has(g.id),
    }));
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
