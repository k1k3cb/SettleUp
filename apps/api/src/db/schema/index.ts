/**
 * SettleUp — Schema de base de datos (Drizzle ORM + PostgreSQL)
 *
 * Convenciones:
 * - Integridad financiera: importes SIEMPRE en centavos como integer (nunca float).
 * - Auditoría: gastos son inmutables; "borrar" = marcar isCancelled.
 * - Splits normalizados para calcular balances con una sola query agregada.
 *
 * Auth: las tablas user/session/account/verification siguen la convención
 * de Better Auth (nombres en singular, snake_case en SQL, camelCase en TS).
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------

export const splitMethodEnum = pgEnum("split_method", [
  "equal",       // dividido a partes iguales
  "exact",       // montos exactos por persona
  "percentage",  // porcentaje por persona
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

// ---------- USERS (Better Auth: tabla "user") ----------
// NOTA: Las 4 tablas de Better Auth (user, session, account, verification)
// usan `text` para `id` en vez de `uuid` porque el adapter Drizzle de
// Better Auth genera IDs en JS (strings de 32 chars) y los pasa al INSERT.
// En uuid de Postgres, el cast falla. Usar text es lo que recomienda la doc
// de Better Auth para Postgres cuando no se quiere custom ID generation.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- SESSIONS (Better Auth) ----------

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- ACCOUNTS (Better Auth) ----------

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- VERIFICATIONS (Better Auth) ----------

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------- GROUPS ----------

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: text("created_by")
    .references(() => user.id)
    .notNull(),
  inviteCode: text("invite_code").notNull().unique(), // para el link de invitación
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla puente: quién pertenece a qué grupo (many-to-many)
export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id)
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueMembership: uniqueIndex("unique_group_user").on(
      table.groupId,
      table.userId
    ),
    userGroupsIdx: index("idx_group_members_user").on(table.userId),
  })
);

// ---------- EXPENSES ----------

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("EUR").notNull(),
    paidBy: text("paid_by")
      .references(() => user.id)
      .notNull(),
    splitMethod: splitMethodEnum("split_method").notNull(),
    isCancelled: boolean("is_cancelled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    groupCreatedIdx: index("idx_expenses_group_created").on(
      table.groupId,
      table.createdAt
    ),
    groupPayerIdx: index("idx_expenses_group_payer").on(
      table.groupId,
      table.paidBy
    ),
  })
);

// Cómo se reparte cada gasto entre los miembros del grupo
export const expenseSplits = pgTable(
  "expense_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .references(() => expenses.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id)
      .notNull(),
    owedAmountCents: integer("owed_amount_cents").notNull(),
  },
  (table) => ({
    userExpenseIdx: index("idx_splits_user_expense").on(
      table.userId,
      table.expenseId
    ),
  })
);

// ---------- SETTLEMENTS (pagos para saldar deuda) ----------

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    fromUser: text("from_user")
      .references(() => user.id)
      .notNull(),
    toUser: text("to_user")
      .references(() => user.id)
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: settlementStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (table) => ({
    groupStatusIdx: index("idx_settlements_group_status").on(
      table.groupId,
      table.status
    ),
  })
);

// ---------- RELATIONS ----------

export const userRelations = relations(user, ({ many }) => ({
  groupMemberships: many(groupMembers),
  expensesPaid: many(expenses),
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  payer: one(user, {
    fields: [expenses.paidBy],
    references: [user.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(user, {
    fields: [expenseSplits.userId],
    references: [user.id],
  }),
}));

/**
 * Cálculo de saldos (single query agregada):
 *
 * Convención: balance positivo = le deben al usuario; negativo = el usuario debe.
 *
 *   balance[user] = +SUM(expenses WHERE paidBy = user)
 *                  -SUM(expenseSplits WHERE userId = user)
 *                  +SUM(settlements WHERE fromUser = user, confirmed)
 *                  -SUM(settlements WHERE toUser = user, confirmed)
 *
 * Lógica de simplificación en apps/api/src/modules/balances/debtSimplifier.ts.
 */
