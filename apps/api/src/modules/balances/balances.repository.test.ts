import { describe, it, expect } from "vitest";
import { sumByUser, flipSign, type SumRow } from "./balances.repository.js";

describe("sumByUser", () => {
  it("suma totales por usuario", () => {
    const rows: SumRow[][] = [
      [{ userId: "alice", total: 1000 }],
      [{ userId: "alice", total: 500 }, { userId: "bob", total: 200 }],
    ];
    const result = sumByUser(rows);
    expect(result).toEqual({ alice: 1500, bob: 200 });
  });

  it("ignora filas con total null", () => {
    const rows: SumRow[][] = [
      [{ userId: "alice", total: null }, { userId: "bob", total: 500 }],
    ];
    const result = sumByUser(rows);
    expect(result).toEqual({ bob: 500 });
  });

  it("parsea strings numéricos (formato de Drizzle SUM)", () => {
    const rows: SumRow[][] = [[{ userId: "alice", total: "1500" }]];
    expect(sumByUser(rows)).toEqual({ alice: 1500 });
  });

  it("ignora NaN después de parsear", () => {
    const rows: SumRow[][] = [[{ userId: "alice", total: "abc" }]];
    expect(sumByUser(rows)).toEqual({});
  });

  it("maneja arrays vacíos", () => {
    expect(sumByUser([])).toEqual({});
    expect(sumByUser([[], []])).toEqual({});
  });
});

describe("flipSign", () => {
  it("niega números positivos", () => {
    const rows: SumRow[] = [{ userId: "a", total: 100 }];
    expect(flipSign(rows)).toEqual([{ userId: "a", total: -100 }]);
  });

  it("niega números negativos", () => {
    const rows: SumRow[] = [{ userId: "a", total: -100 }];
    expect(flipSign(rows)).toEqual([{ userId: "a", total: 100 }]);
  });

  it("preserva null", () => {
    const rows: SumRow[] = [{ userId: "a", total: null }];
    expect(flipSign(rows)).toEqual([{ userId: "a", total: null }]);
  });

  it("antepone - a strings numéricos (preserva el formato Drizzle)", () => {
    const rows: SumRow[] = [{ userId: "a", total: "1500" }];
    expect(flipSign(rows)).toEqual([{ userId: "a", total: "-1500" }]);
  });

  it("no muta el array original", () => {
    const rows: SumRow[] = [{ userId: "a", total: 100 }];
    const snapshot = JSON.stringify(rows);
    flipSign(rows);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});

describe("combinación: pipeline de balances", () => {
  it("reproduce el caso real del grupo Viaje a París (1 gasto + 2 settlements)", () => {
    // 1 gasto de 4500c pagado por tu
    const paidResult: SumRow[] = [
      { userId: "tu", total: 4500 },
    ];
    // Splits: tu, user2, user3 deben 1500 cada uno
    const owedResult: SumRow[] = [
      { userId: "tu", total: 1500 },
      { userId: "user2", total: 1500 },
      { userId: "user3", total: 1500 },
    ];
    // user2 y user3 PAGARON 15€ a tu (fromUser = ellos)
    const fromSettlementResult: SumRow[] = [
      { userId: "user2", total: 1500 },
      { userId: "user3", total: 1500 },
    ];
    // tu RECIBIÓ 15€ de cada uno (toUser = tu)
    const toSettlementResult: SumRow[] = [
      { userId: "tu", total: 3000 },
    ];

    const result = sumByUser([
      paidResult,                     // +
      flipSign(owedResult),           // -
      fromSettlementResult,           // +
      flipSign(toSettlementResult),   // -
    ]);

    // tu pagó 45€, debe 15€ (su parte), envió 0, recibió 30€ en pagos
    // → balance = 4500 - 1500 + 0 - 3000 = 0 (cuenta saldada)
    expect(result.tu).toBe(0);
    // user2 no pagó nada, debe 15€ (su parte), envió 15€ en pago, recibió 0
    // → balance = 0 - 1500 + 1500 - 0 = 0
    expect(result.user2).toBe(0);
    // user3 igual
    expect(result.user3).toBe(0);

    // Invariante: la suma total de balances debe ser 0
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });

  it("REGRESIÓN: el bug anterior aplicaba el signo inverso a settlements (descubierto al escribir este test)", () => {
    // Con el bug (toUser +, fromUser -), el balance de tu era 6000 en vez
    // de 0, porque contaba el doble (4500 pagado + 3000 recibido sin restar).
    // Este test verifica que el fix es correcto: el grupo liquidado
    // tiene todos a 0, no a +60/-30/-30.
    const paidResult: SumRow[] = [{ userId: "tu", total: 4500 }];
    const owedResult: SumRow[] = [
      { userId: "tu", total: 1500 },
      { userId: "user2", total: 1500 },
      { userId: "user3", total: 1500 },
    ];
    const fromSettlementResult: SumRow[] = [
      { userId: "user2", total: 1500 },
      { userId: "user3", total: 1500 },
    ];
    const toSettlementResult: SumRow[] = [{ userId: "tu", total: 3000 }];

    // El pipeline correcto (versión actual del repo):
    const correct = sumByUser([
      paidResult,
      flipSign(owedResult),
      fromSettlementResult,
      flipSign(toSettlementResult),
    ]);

    // El pipeline bugueado (versión anterior):
    const buggy = sumByUser([
      paidResult,
      flipSign(owedResult),
      flipSign(fromSettlementResult), // signo invertido
      toSettlementResult,            // sin flip
    ]);

    expect(correct.tu).toBe(0);
    expect(buggy.tu).toBe(6000); // confirma que el bug existía
  });
});
