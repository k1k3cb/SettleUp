import { and, eq, sum } from "drizzle-orm";
import { db } from "../../db/index.js";
import { expenses, expenseSplits, settlements } from "../../db/schema/index.js";

/**
 * Query agregada para el balance neto de cada miembro de un grupo.
 *
 *   balance[user] = +SUM(expenses WHERE paidBy=user AND groupId=?)
 *                  -SUM(expenseSplits WHERE userId=user AND expenseId IN expenses del grupo)
 *                  -SUM(settlements WHERE fromUser=user AND groupId=? AND status=confirmed)
 *                  +SUM(settlements WHERE toUser=user AND groupId=? AND status=confirmed)
 *
 * Convención: balance positivo = le deben al usuario (acreedor);
 *             balance negativo = el usuario debe (deudor).
 *
 * Lógica del signo de los settlements:
 *   - `fromUser=user` (yo pago a mi deudor): mi acreencia baja, mi balance BAJA. Signo NEGATIVO.
 *   - `toUser=user` (yo recibo de mi deudor): mi balance SUBE. Signo POSITIVO.
 *
 * Implementación: 4 queries en paralelo, una por término, y se combinan
 * en JS. La query equivalente en SQL puro sería un UNION ALL de 4 SUMs
 * agrupados por user; la versión paralela es más legible y la latencia
 * es equivalente con un pool de WebSocket (no se serializa).
 *
 * Por invariante del sistema, la suma de todos los balances de un grupo
 * debe ser 0.
 */
export class BalancesRepository {
  async getNetBalances(groupId: string): Promise<Record<string, number>> {
    const [paidResult, owedResult, fromSettlementResult, toSettlementResult] =
      await Promise.all([
        db
          .select({ userId: expenses.paidBy, total: sum(expenses.amountCents) })
          .from(expenses)
          .where(
            and(
              eq(expenses.groupId, groupId),
              eq(expenses.isCancelled, false),
            ),
          )
          .groupBy(expenses.paidBy),

        db
          .select({
            userId: expenseSplits.userId,
            total: sum(expenseSplits.owedAmountCents),
          })
          .from(expenseSplits)
          .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
          .where(
            and(
              eq(expenses.groupId, groupId),
              eq(expenses.isCancelled, false),
            ),
          )
          .groupBy(expenseSplits.userId),

        db
          .select({ userId: settlements.fromUser, total: sum(settlements.amountCents) })
          .from(settlements)
          .where(
            and(
              eq(settlements.groupId, groupId),
              eq(settlements.status, "confirmed"),
            ),
          )
          .groupBy(settlements.fromUser),

        db
          .select({ userId: settlements.toUser, total: sum(settlements.amountCents) })
          .from(settlements)
          .where(
            and(
              eq(settlements.groupId, groupId),
              eq(settlements.status, "confirmed"),
            ),
          )
          .groupBy(settlements.toUser),
      ]);

    return sumByUser([
      paidResult,                    // +  pagué por el grupo
      flipSign(owedResult),          // -  me toca pagar
      flipSign(fromSettlementResult), // -  pagué mi deuda
      toSettlementResult,            // +  recibí pago de mi acreedor
    ]);
  }
}

type SumRow = { userId: string; total: string | number | null };

function sumByUser(rows: SumRow[][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of rows) {
    for (const row of group) {
      if (row.total == null) continue;
      const cents =
        typeof row.total === "string" ? parseInt(row.total, 10) : row.total;
      if (!Number.isFinite(cents)) continue;
      out[row.userId] = (out[row.userId] ?? 0) + cents;
    }
  }
  return out;
}

/**
 * Niega el total de cada fila. Para términos que restan en el balance.
 */
function flipSign(rows: SumRow[]): SumRow[] {
  return rows.map((r) => ({
    userId: r.userId,
    total: r.total == null
      ? null
      : typeof r.total === "string"
        ? `-${r.total}`
        : -r.total,
  }));
}

