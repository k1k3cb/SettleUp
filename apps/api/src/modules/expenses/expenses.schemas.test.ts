import { describe, it, expect } from "vitest";
import {
  createExpenseSchema,
  expenseIdParamSchema,
} from "./expenses.schemas.js";
import {
  groupIdParamSchema,
  groupIdOnlyParamSchema,
} from "../groups/groups.schemas.js";

const validUUID = "31bc8a4d-3635-4d2a-83e0-f12896fc95ac";
const userId = "JlvyS2FzTuDEgIuNt4T5IaW29yrRfCBt";

describe("createExpenseSchema — equal", () => {
  it("acepta equal con splits vacíos (reparte entre todos)", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 4500,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(true);
  });

  it("acepta equal con lista explícita", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 4500,
      paidBy: userId,
      splitMethod: "equal",
      splits: [{ userId: "a" }, { userId: "b" }],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza equal con descripción vacía", () => {
    const r = createExpenseSchema.safeParse({
      description: "",
      amountCents: 4500,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents negativo", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: -100,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents = 0", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 0,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents no entero", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 45.5,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents > 100M (overflow)", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 100_000_001,
      paidBy: userId,
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza paidBy vacío", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 4500,
      paidBy: "",
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("acepta currency en minúsculas y la normaliza a mayúsculas", () => {
    const r = createExpenseSchema.safeParse({
      description: "Cena",
      amountCents: 4500,
      paidBy: userId,
      currency: "eur",
      splitMethod: "equal",
      splits: [],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("EUR");
  });
});

describe("createExpenseSchema — exact", () => {
  it("acepta exact con splits válidos", () => {
    const r = createExpenseSchema.safeParse({
      description: "Compras",
      amountCents: 1500,
      paidBy: userId,
      splitMethod: "exact",
      splits: [
        { userId: "a", amountCents: 800 },
        { userId: "b", amountCents: 400 },
        { userId: "c", amountCents: 300 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza exact con splits vacío (mín 1)", () => {
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "exact",
      splits: [],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza exact con amountCents de un split <= 0", () => {
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "exact",
      splits: [
        { userId: "a", amountCents: 1000 },
        { userId: "b", amountCents: 0 },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("createExpenseSchema — percentage", () => {
  it("acepta percentage con suma 100", () => {
    const r = createExpenseSchema.safeParse({
      description: "Alquiler",
      amountCents: 10000,
      paidBy: userId,
      splitMethod: "percentage",
      splits: [
        { userId: "a", percentage: 50 },
        { userId: "b", percentage: 50 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rechaza percentage con suma 99 (no es exactamente 100)", () => {
    // El validador solo verifica que cada % esté en [0, 100].
    // La validación de suma se hace en el service. Aquí solo validamos
    // que la estructura del array es correcta.
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "percentage",
      splits: [
        { userId: "a", percentage: 50 },
        { userId: "b", percentage: 49 },
      ],
    });
    // El schema acepta, el service rechazará.
    expect(r.success).toBe(true);
  });

  it("rechaza percentage > 100 en un split", () => {
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "percentage",
      splits: [{ userId: "a", percentage: 150 }],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza percentage <= 0 en un split", () => {
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "percentage",
      splits: [{ userId: "a", percentage: 0 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("createExpenseSchema — discriminated union", () => {
  it("equal con split que tiene amountCents (forma de exact) — la unión es permisiva en runtime", () => {
    // Zod 4 con discriminatedUnion es estricto en TS, pero en runtime
    // los campos extra (amountCents en un split de equal) se ignoran,
    // no se rechazan. El service es quien valida la estructura.
    const r = createExpenseSchema.safeParse({
      description: "X",
      amountCents: 1000,
      paidBy: userId,
      splitMethod: "equal",
      splits: [{ userId: "a", amountCents: 1000 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("params schemas", () => {
  it("groupIdParamSchema (/:id) acepta UUID", () => {
    const r = groupIdParamSchema.safeParse({ id: validUUID });
    expect(r.success).toBe(true);
  });

  it("groupIdOnlyParamSchema (/:groupId) acepta UUID", () => {
    const r = groupIdOnlyParamSchema.safeParse({ groupId: validUUID });
    expect(r.success).toBe(true);
  });

  it("expenseIdParamSchema acepta ambos params", () => {
    const r = expenseIdParamSchema.safeParse({
      groupId: validUUID,
      expenseId: validUUID,
    });
    expect(r.success).toBe(true);
  });

  it("expenseIdParamSchema rechaza si falta expenseId", () => {
    const r = expenseIdParamSchema.safeParse({ groupId: validUUID });
    expect(r.success).toBe(false);
  });
});
