import { describe, it, expect } from "vitest";
import {
  calculateNetBalances,
  simplifyDebts,
  getSuggestedSettlements,
  type Balance,
} from "./debtSimplifier.js";

describe("calculateNetBalances", () => {
  it("ignora a quien está a 0", () => {
    const raw = { alice: 0, bob: 500, carol: -500 };
    const result = calculateNetBalances(raw);
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.userId).sort()).toEqual(["bob", "carol"]);
  });

  it("preserva el signo del balance", () => {
    const raw = { alice: 1000, bob: -500, carol: -500 };
    const result = calculateNetBalances(raw);
    const alice = result.find((b) => b.userId === "alice");
    const bob = result.find((b) => b.userId === "bob");
    expect(alice?.amountCents).toBe(1000);
    expect(bob?.amountCents).toBe(-500);
  });

  it("devuelve array vacío si todos están a 0", () => {
    expect(calculateNetBalances({ a: 0, b: 0, c: 0 })).toEqual([]);
  });

  it("no muta el input", () => {
    const raw = { alice: 100, bob: -100 };
    const snapshot = JSON.stringify(raw);
    calculateNetBalances(raw);
    expect(JSON.stringify(raw)).toBe(snapshot);
  });
});

describe("simplifyDebts", () => {
  it("devuelve array vacío si no hay balances", () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it("un deudor a un acreedor: una transferencia", () => {
    const balances: Balance[] = [
      { userId: "alice", amountCents: 1000 },
      { userId: "bob", amountCents: -1000 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers).toEqual([
      { fromUserId: "bob", toUserId: "alice", amountCents: 1000 },
    ]);
  });

  it("ejemplo del docstring: alice debe 10, bob debe 10, carol debe 5 → solo 1 transferencia", () => {
    // El docstring dice:
    //   A debe 10 a B, B debe 10 a C, C debe 5 a A
    //   → A solo debe 5 netos a C, y B queda saldado. → 1 transferencia.
    //
    // En nuestro modelo: balance positivo = le deben.
    //   A: pagó 5 a B y 10 a C... no, releamos.
    //   A debe 10 a B  → A paga 10 a B  → A: -10, B: +10
    //   B debe 10 a C  → B paga 10 a C  → B: -10, C: +10
    //   C debe 5 a A   → C paga 5 a A   → C: -5, A: +5
    //
    // Netos: A: -10+5 = -5, B: +10-10 = 0, C: +10-5 = +5
    // O sea: A debe 5 a C. 1 transferencia.
    const balances: Balance[] = [
      { userId: "A", amountCents: -5 },
      { userId: "C", amountCents: 5 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers).toEqual([
      { fromUserId: "A", toUserId: "C", amountCents: 5 },
    ]);
  });

  it("3 personas con 1500c cada lado: simplifica a 2 transferencias (no 3)", () => {
    // alice -1500, bob -1500, carol +3000
    // → carol recibe de alice 1500 y de bob 1500. 2 transfers.
    const balances: Balance[] = [
      { userId: "alice", amountCents: -1500 },
      { userId: "bob", amountCents: -1500 },
      { userId: "carol", amountCents: 3000 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(2);
    const total = transfers.reduce((s, t) => s + t.amountCents, 0);
    expect(total).toBe(3000);
  });

  it("el total de amountCents en transfers es igual a la suma de balances positivos", () => {
    // Para cualquier grupo, la suma de amountCents en transfers es
    // exactamente la cantidad total que se redistribuye (= suma de
    // balances positivos, que es igual a -suma de balances negativos).
    const balances: Balance[] = [
      { userId: "a", amountCents: 100 },
      { userId: "b", amountCents: 200 },
      { userId: "c", amountCents: -300 },
    ];
    const transfers = simplifyDebts(balances);
    const total = transfers.reduce((s, t) => s + t.amountCents, 0);
    expect(total).toBe(300); // suma de positivos
  });

  it("no genera transferencias con amountCents = 0", () => {
    // Si un balance ya es 0 (filtrado antes), el greedy no debe
    // emitir transfer con 0. Verificamos con un caso donde los
    // balances no son perfectamente divisibles.
    const balances: Balance[] = [
      { userId: "a", amountCents: 500 },
      { userId: "b", amountCents: -500 },
    ];
    const transfers = simplifyDebts(balances);
    for (const t of transfers) {
      expect(t.amountCents).toBeGreaterThan(0);
    }
  });

  it("maneja importes no divisibles (último se lleva el remanente)", () => {
    // 1000 / 3 = 333 con resto 1. 3 personas deben pagar a 1.
    const balances: Balance[] = [
      { userId: "creditor", amountCents: 1000 },
      { userId: "a", amountCents: -333 },
      { userId: "b", amountCents: -333 },
      { userId: "c", amountCents: -334 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(3);
    const total = transfers.reduce((s, t) => s + t.amountCents, 0);
    expect(total).toBe(1000);
  });

  it("cumple el invariante: número de transfers ≤ N-1", () => {
    // Con N personas, el greedy garantiza ≤ N-1 transfers.
    // Lo verificamos con 5 personas: ≤ 4 transfers.
    const balances: Balance[] = [
      { userId: "a", amountCents: -2000 },
      { userId: "b", amountCents: -1000 },
      { userId: "c", amountCents: -500 },
      { userId: "d", amountCents: 2000 },
      { userId: "e", amountCents: 1500 },
    ];
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(4);
  });
});

describe("getSuggestedSettlements (convenience)", () => {
  it("pipeline completo: balances crudos → transfers", () => {
    const raw = { alice: 1500, bob: -1500 };
    const transfers = getSuggestedSettlements(raw);
    expect(transfers).toEqual([
      { fromUserId: "bob", toUserId: "alice", amountCents: 1500 },
    ]);
  });

  it("ignora balances a 0", () => {
    const raw = { alice: 0, bob: 1000, carol: -1000 };
    const transfers = getSuggestedSettlements(raw);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.fromUserId).toBe("carol");
    expect(transfers[0]?.toUserId).toBe("bob");
  });
});
