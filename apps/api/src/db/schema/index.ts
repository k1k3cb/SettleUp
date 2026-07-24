/**
 * SettleUp — Schema de base de datos (Drizzle ORM + PostgreSQL)
 *
 * Diseño pensado para:
 * 1. Integridad financiera: nunca perder o duplicar un céntimo (usamos enteros
 *    en centavos, NUNCA float, para evitar errores de redondeo).
 * 2. Auditoría: cada gasto queda inmutable una vez creado (si se "borra",
 *    se marca como cancelado, no se elimina la fila).
 * 3. Simplicidad de consulta: los "splits" (repartos) están normalizados en
 *    su propia tabla para poder calcular saldos con una sola query agregada.
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
]);

// ---------- USERS ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- GROUPS ----------

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
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
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    // Un usuario no puede estar dos veces en el mismo grupo
    uniqueMembership: uniqueIndex("unique_group_user").on(
      table.groupId,
      table.userId
    ),
    // Acelera "dame todos los grupos de este usuario"
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
    // SIEMPRE en centavos (integer), nunca float, para evitar errores de
    // redondeo con dinero. 15.50€ se guarda como 1550.
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("EUR").notNull(),
    paidBy: uuid("paid_by")
      .references(() => users.id)
      .notNull(),
    splitMethod: splitMethodEnum("split_method").notNull(),
    isCancelled: boolean("is_cancelled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Para listar los gastos de un grupo ordenados por fecha
    groupCreatedIdx: index("idx_expenses_group_created").on(
      table.groupId,
      table.createdAt
    ),
    // Para el cálculo de balances: "lo que pagó cada uno en este grupo"
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
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    // Cuánto debe esta persona de este gasto concreto, en centavos.
    // La suma de todos los owedAmountCents de un expense debe == amountCents.
    owedAmountCents: integer("owed_amount_cents").notNull(),
  },
  (table) => ({
    // Acelera el cálculo de balances: "cuánto debe este usuario en este grupo"
    userExpenseIdx: index("idx_splits_user_expense").on(
      table.userId,
      table.expenseId
    ),
  })
);

// ---------- SETTLEMENTS (pagos para saldar deuda) ----------
// Cuando alguien "paga" lo que debe, se registra aquí. Esto es lo que
// consume tu algoritmo de simplificación: sugiere settlements óptimos,
// el usuario los confirma, y aquí quedan registrados.

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    fromUser: uuid("from_user")
      .references(() => users.id)
      .notNull(), // quien paga
    toUser: uuid("to_user")
      .references(() => users.id)
      .notNull(), // quien recibe
    amountCents: integer("amount_cents").notNull(),
    status: settlementStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (table) => ({
    // Para el cálculo de balances por grupo
    groupStatusIdx: index("idx_settlements_group_status").on(
      table.groupId,
      table.status
    ),
  })
);

// ---------- RELATIONS (para queries tipadas con Drizzle) ----------

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  expensesPaid: many(expenses),
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
  payer: one(users, {
    fields: [expenses.paidBy],
    references: [users.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id],
  }),
}));

/**
 * NOTA SOBRE EL CÁLCULO DE SALDOS (el corazón del proyecto):
 *
 * El saldo neto de cada usuario en un grupo se calcula así (pseudocódigo SQL):
 *
 *   balance[user] = SUM(expenses.amountCents WHERE paidBy = user)
 *                  - SUM(expenseSplits.owedAmountCents WHERE userId = user)
 *                  + SUM(settlements.amountCents WHERE toUser = user, confirmed)
 *                  - SUM(settlements.amountCents WHERE fromUser = user, confirmed)
 *
 * Con esos balances netos por usuario, el algoritmo de simplificación de
 * deudas (greedy: emparejar el mayor deudor con el mayor acreedor
 * repetidamente) genera la lista mínima de transferencias sugeridas.
 * Esa lógica vive en el backend, en un servicio separado (ej. debtSimplifier.ts),
 * NO en el schema — pero el schema está diseñado para que esa query
 * de balances sea una sola consulta agregada eficiente.
 */
