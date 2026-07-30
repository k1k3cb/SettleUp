import { describe, it, expect } from "vitest";
import {
  createSettlementSchema,
  groupIdOnlyParamSchema,
  settlementIdParamSchema,
} from "./settlements.schemas.js";

const validUUID = "31bc8a4d-3635-4d2a-83e0-f12896fc95ac";
const userId = "JlvyS2FzTuDEgIuNt4T5IaW29yrRfCBt";

describe("createSettlementSchema", () => {
  it("acepta settlement válido", () => {
    const r = createSettlementSchema.safeParse({
      toUser: userId,
      amountCents: 1500,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza toUser vacío", () => {
    const r = createSettlementSchema.safeParse({
      toUser: "",
      amountCents: 1500,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents = 0", () => {
    const r = createSettlementSchema.safeParse({
      toUser: userId,
      amountCents: 0,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents negativo", () => {
    const r = createSettlementSchema.safeParse({
      toUser: userId,
      amountCents: -100,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents no entero", () => {
    const r = createSettlementSchema.safeParse({
      toUser: userId,
      amountCents: 15.5,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza amountCents > 100M", () => {
    const r = createSettlementSchema.safeParse({
      toUser: userId,
      amountCents: 100_000_001,
    });
    expect(r.success).toBe(false);
  });
});

describe("settlementIdParamSchema", () => {
  it("acepta groupId y settlementId", () => {
    const r = settlementIdParamSchema.safeParse({
      groupId: validUUID,
      settlementId: validUUID,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza si falta settlementId", () => {
    const r = settlementIdParamSchema.safeParse({ groupId: validUUID });
    expect(r.success).toBe(false);
  });
});

describe("groupIdOnlyParamSchema (re-uso en settlements)", () => {
  it("acepta UUID en groupId", () => {
    const r = groupIdOnlyParamSchema.safeParse({ groupId: validUUID });
    expect(r.success).toBe(true);
  });
});
