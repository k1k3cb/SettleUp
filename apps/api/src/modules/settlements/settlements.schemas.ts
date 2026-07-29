import { z } from "zod";

// ---------- Params ----------

export const groupIdOnlyParamSchema = z.object({
  groupId: z.string().uuid("Invalid group id"),
});

export const settlementIdParamSchema = z.object({
  groupId: z.string().uuid("Invalid group id"),
  settlementId: z.string().uuid("Invalid settlement id"),
});

// ---------- Create settlement ----------

export const createSettlementSchema = z.object({
  toUser: z.string().min(1, "Recipient is required"),
  amountCents: z
    .number()
    .int("Amount must be in cents (integer)")
    .positive("Amount must be greater than 0")
    .max(100_000_000, "Amount is too large"),
});

// ---------- Types ----------

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
