import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, expenseSplits, groupMembers } from "../../db/schema/index.js";

export type Expense = typeof expenses.$inferSelect;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;

export class ExpensesRepository {
  /**
   * Crea un expense y todos sus splits en una sola transacción.
   * El expenseId se asigna a los splits tras el INSERT del expense.
   * Si cualquier INSERT falla, se hace rollback de todo.
   */
  async createWithSplits(
    data: typeof expenses.$inferInsert,
    splitsWithoutExpenseId: Array<Omit<typeof expenseSplits.$inferInsert, "expenseId">>,
  ): Promise<{ expense: Expense; splits: ExpenseSplit[] }> {
    return db.transaction(async (tx) => {
      const [expense] = await tx.insert(expenses).values(data).returning();
      const splitsWithExpenseId = splitsWithoutExpenseId.map((s) => ({
        ...s,
        expenseId: expense.id,
      }));
      const insertedSplits = await tx
        .insert(expenseSplits)
        .values(splitsWithExpenseId)
        .returning();
      return { expense, splits: insertedSplits };
    });
  }

  async findById(id: string): Promise<Expense | null> {
    const [row] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);
    return row ?? null;
  }

  /**
   * Lista los gastos de un grupo ordenados por createdAt desc.
   * Incluye los splits de cada gasto en una segunda query (N+1 evitado
   * parcialmente: 2 queries totales en vez de 1 + N).
   */
  async listByGroup(groupId: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.groupId, groupId),
          eq(expenses.isCancelled, false),
        ),
      )
      .orderBy(desc(expenses.createdAt));
  }

  /**
   * Carga los splits de varios expenses en una sola query.
   * Devuelve un Map<expenseId, splits[]>.
   */
  async splitsByExpenseIds(
    expenseIds: string[],
  ): Promise<Map<string, ExpenseSplit[]>> {
    if (expenseIds.length === 0) return new Map();
    const rows = await db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseIds));
    const map = new Map<string, ExpenseSplit[]>();
    for (const row of rows) {
      const list = map.get(row.expenseId) ?? [];
      list.push(row);
      map.set(row.expenseId, list);
    }
    return map;
  }

  /**
   * Soft delete: marca isCancelled=true. El row sigue en la DB para
   * mantener la auditoría, pero no aparece en listByGroup ni en balances.
   */
  async softDelete(id: string): Promise<boolean> {
    const rows = await db
      .update(expenses)
      .set({ isCancelled: true })
      .where(eq(expenses.id, id))
      .returning();
    return rows.length > 0;
  }

  /**
   * Devuelve los IDs de los miembros de un grupo.
   * Lo usa el service para validar que paidBy y los splits.userId
   * pertenezcan al grupo.
   */
  async getMemberIds(groupId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return rows.map((r) => r.userId);
  }
}
