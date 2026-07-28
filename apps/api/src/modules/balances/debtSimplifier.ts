/**
 * debtSimplifier.ts
 *
 * Algoritmo de simplificación de deudas ("min cash flow" / "debt simplification").
 *
 * PROBLEMA:
 * En un grupo, N personas tienen deudas cruzadas entre sí (A le debe a B,
 * B le debe a C, C le debe a A...). Si liquidáramos deuda por deuda,
 * podríamos acabar con muchas más transferencias de las necesarias.
 *
 * EJEMPLO:
 *   A debe 10€ a B
 *   B debe 10€ a C
 *   C debe 5€ a A
 *
 *   Ingenuamente: 3 transferencias.
 *   Óptimo: A solo debe 5€ netos a C, y B queda saldado. → 1 transferencia.
 *
 * ESTRATEGIA:
 * 1. Reducir el problema a un balance neto por persona (cuánto debe o le deben
 *    EN TOTAL, sin importar a quién). Esto convierte un grafo con N*(N-1)
 *    aristas posibles en un simple vector de N números que suman 0.
 * 2. Aplicar un algoritmo greedy: en cada paso, emparejar al mayor deudor
 *    con el mayor acreedor, transferir el mínimo de los dos montos, y
 *    repetir hasta que todos los balances sean 0.
 *
 * GARANTÍA MATEMÁTICA:
 * Este greedy no siempre da el número MÍNIMO absoluto de transacciones
 * (ese es un problema NP-difícil en el caso general, equivalente a un
 * problema de partición de conjuntos). Pero da una MUY BUENA aproximación
 * en tiempo O(N log N) y es el mismo enfoque que usa Splitwise en producción.
 * Para un grupo de N personas, garantiza como máximo N-1 transacciones
 * (nunca peor que "todos le pagan a un tesorero central").
 *
 * Si en la entrevista te preguntan "¿es óptimo?": la respuesta honesta es
 * "es una heurística greedy que da como máximo N-1 transacciones y en la
 * práctica coincide con el óptimo en la mayoría de los casos reales;
 * encontrar el mínimo exacto es NP-difícil para N grande".
 */

export interface Balance {
  userId: string;
  amountCents: number; // positivo = le deben (acreedor), negativo = debe (deudor)
}

export interface SuggestedTransfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

// ---------- PASO 1: calcular balances netos ----------

export function calculateNetBalances(
  rawBalances: Record<string, number>
): Balance[] {
  return Object.entries(rawBalances)
    .map(([userId, amountCents]) => ({ userId, amountCents }))
    .filter((b) => b.amountCents !== 0);
}

// ---------- PASO 2: algoritmo greedy de simplificación ----------

export function simplifyDebts(balances: Balance[]): SuggestedTransfer[] {
  const debtors = balances
    .filter((b) => b.amountCents < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.amountCents - b.amountCents);

  const creditors = balances
    .filter((b) => b.amountCents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: SuggestedTransfer[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;

    const amount = Math.min(-debtor.amountCents, creditor.amountCents);

    if (amount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: amount,
      });
    }

    debtor.amountCents += amount;
    creditor.amountCents -= amount;

    if (debtor.amountCents === 0) i++;
    if (creditor.amountCents === 0) j++;
  }

  return transfers;
}

export function getSuggestedSettlements(
  rawBalances: Record<string, number>
): SuggestedTransfer[] {
  const balances = calculateNetBalances(rawBalances);
  return simplifyDebts(balances);
}
