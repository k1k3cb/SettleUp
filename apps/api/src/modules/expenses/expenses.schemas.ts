import { z } from "zod";

// ---------- Params ----------

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid("Invalid group id"),
});

export const expenseIdParamSchema = z.object({
  groupId: z.string().uuid("Invalid group id"),
  expenseId: z.string().uuid("Invalid expense id"),
});

// ---------- Helpers ----------

const centsAmount = z
  .number()
  .int("Amount must be in cents (integer)")
  .positive("Amount must be greater than 0")
  .max(100_000_000, "Amount is too large"); // 1M EUR

// ---------- Split per method ----------

// Para "equal": el frontend puede enviar splits vacíos (el backend calcula)
// o una lista explícita de miembros. Si la lista viene, debe incluir
// al menos a un usuario.
const equalSplitsSchema = z
  .array(
    z.object({
      userId: z.string().min(1, "User id is required"),
    }),
  )
  .default([]);

// Para "exact": el frontend envía el monto exacto en centavos que debe
// cada persona. La suma DEBE coincidir con amountCents del gasto.
const exactSplitsSchema = z
  .array(
    z.object({
      userId: z.string().min(1, "User id is required"),
      amountCents: centsAmount,
    }),
  )
  .min(1, "At least one split is required");

// Para "percentage": el frontend envía el porcentaje que debe cada
// persona (0-100, dos decimales). La suma DEBE ser exactamente 100.
const percentageSplitsSchema = z
  .array(
    z.object({
      userId: z.string().min(1, "User id is required"),
      percentage: z
        .number()
        .positive("Percentage must be greater than 0")
        .max(100, "Percentage cannot exceed 100")
        .multipleOf(0.01, "Percentage can have at most 2 decimals"),
    }),
  )
  .min(1, "At least one split is required");

// ---------- Create expense (discriminated union) ----------

const baseExpenseFields = {
  description: z
    .string()
    .min(1, "Description is required")
    .max(120, "Description must be 120 characters or less")
    .trim(),
  amountCents: centsAmount,
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO code (e.g. EUR)")
    .toUpperCase()
    .default("EUR"),
  paidBy: z.string().min(1, "paidBy is required"),
};

export const createExpenseSchema = z.discriminatedUnion("splitMethod", [
  z.object({
    ...baseExpenseFields,
    splitMethod: z.literal("equal"),
    splits: equalSplitsSchema,
  }),
  z.object({
    ...baseExpenseFields,
    splitMethod: z.literal("exact"),
    splits: exactSplitsSchema,
  }),
  z.object({
    ...baseExpenseFields,
    splitMethod: z.literal("percentage"),
    splits: percentageSplitsSchema,
  }),
]);

// ---------- Types ----------

export type GroupIdParam = z.infer<typeof groupIdParamSchema>;
export type ExpenseIdParam = z.infer<typeof expenseIdParamSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
