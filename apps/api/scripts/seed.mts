/**
 * Seed de datos de ejemplo.
 *
 * Borra gastos, splits, settlements, group_members y groups.
 * NO borra usuarios (preserva las credenciales para poder hacer login).
 *
 * Crea dos grupos:
 *   - "Piso de Madrid" (3 miembros): gastos con los 3 métodos de split
 *     (equal, exact, percentage) y un settlement parcial.
 *   - "Cenas de Barcelona" (2 miembros): 1 gasto equal + 1 settlement
 *     que liquida parte de la deuda.
 *
 * Uso:
 *   pnpm --filter @settleup/api exec tsx scripts/seed.mts
 */
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

const log = (msg: string) => console.log(`  ${msg}`);

async function wipe() {
  console.log("\n== Limpiando gastos, splits, settlements, group_members, groups ==");
  // CASCADE: borrar expenses borra expense_splits; borrar groups borra
  // group_members y settlements. Hago en orden para evitar FK issues.
  await c.query(`DELETE FROM expense_splits`);
  log("expense_splits");
  await c.query(`DELETE FROM expenses`);
  log("expenses");
  await c.query(`DELETE FROM settlements`);
  log("settlements");
  await c.query(`DELETE FROM group_members`);
  log("group_members");
  await c.query(`DELETE FROM groups`);
  log("groups");
}

async function getUserIds() {
  const r = await c.query(`SELECT id, email, name FROM "user" ORDER BY created_at`);
  const byEmail: Record<string, string> = {};
  const byId: Record<string, string> = {};
  for (const row of r.rows) {
    byEmail[row.email] = row.id;
    byId[row.id] = row.name;
  }
  return { byEmail, byId, all: r.rows };
}

async function createGroup(name: string, createdBy: string) {
  const r = await c.query(
    `INSERT INTO groups (name, created_by, invite_code)
     VALUES ($1, $2, substr(md5(random()::text), 1, 12))
     RETURNING id, invite_code`,
    [name, createdBy],
  );
  return r.rows[0] as { id: string; invite_code: string };
}

async function addMember(groupId: string, userId: string) {
  await c.query(
    `INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [groupId, userId],
  );
}

async function createExpense(
  groupId: string,
  description: string,
  amountCents: number,
  paidBy: string,
  splitMethod: "equal" | "exact" | "percentage",
  splits: Array<{ userId: string; amountCents?: number; percentage?: number }>,
) {
  const r = await c.query(
    `INSERT INTO expenses (group_id, description, amount_cents, currency, paid_by, split_method, is_cancelled)
     VALUES ($1, $2, $3, 'EUR', $4, $5, false)
     RETURNING id`,
    [groupId, description, amountCents, paidBy, splitMethod],
  );
  const expenseId = r.rows[0].id as string;

  // El último split se lleva el remanente para que la suma cierre exacto.
  for (let i = 0; i < splits.length; i++) {
    const s = splits[i]!;
    const isLast = i === splits.length - 1;
    let owed: number;
    if (splitMethod === "equal") {
      const base = Math.floor(amountCents / splits.length);
      const remainder = amountCents - base * splits.length;
      owed = base + (isLast ? remainder : 0);
    } else if (splitMethod === "percentage") {
      const pct = s.percentage!;
      const base = Math.floor((pct / 100) * amountCents);
      // Para percentage el remanente va al último
      const previousTotal = splits
        .slice(0, i)
        .reduce((sum, x) => sum + Math.floor(((x.percentage ?? 0) / 100) * amountCents), 0);
      owed = isLast ? amountCents - previousTotal : base;
    } else {
      owed = s.amountCents!;
    }
    await c.query(
      `INSERT INTO expense_splits (expense_id, user_id, owed_amount_cents) VALUES ($1, $2, $3)`,
      [expenseId, s.userId, owed],
    );
  }
  return expenseId;
}

async function createSettlement(
  groupId: string,
  fromUser: string,
  toUser: string,
  amountCents: number,
) {
  await c.query(
    `INSERT INTO settlements (group_id, from_user, to_user, amount_cents, status, confirmed_at)
     VALUES ($1, $2, $3, $4, 'confirmed', NOW())`,
    [groupId, fromUser, toUser, amountCents],
  );
}

async function showBalances(groupId: string, label: string) {
  // Calculo en JS para evitar un GROUP BY con 4 SUMs en una sola query.
  // Primero traigo los miembros del grupo.
  const membersR = await c.query(
    `SELECT u.id, u.name FROM group_members gm
     JOIN "user" u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY u.name`,
    [groupId],
  );
  const balances = new Map<string, number>();
  for (const m of membersR.rows) balances.set(m.id, 0);

  // Pagado
  const paidR = await c.query(
    `SELECT paid_by, SUM(amount_cents) as total FROM expenses
     WHERE group_id = $1 AND is_cancelled = false GROUP BY paid_by`,
    [groupId],
  );
  for (const r of paidR.rows) {
    balances.set(r.paid_by, (balances.get(r.paid_by) ?? 0) + Number(r.total));
  }

  // Debe (restar)
  const owedR = await c.query(
    `SELECT es.user_id, SUM(es.owed_amount_cents) as total
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1 AND e.is_cancelled = false
     GROUP BY es.user_id`,
    [groupId],
  );
  for (const r of owedR.rows) {
    balances.set(r.user_id, (balances.get(r.user_id) ?? 0) - Number(r.total));
  }

  // Settlements enviados (restar)
  const fromR = await c.query(
    `SELECT from_user, SUM(amount_cents) as total FROM settlements
     WHERE group_id = $1 AND status = 'confirmed' GROUP BY from_user`,
    [groupId],
  );
  for (const r of fromR.rows) {
    balances.set(r.from_user, (balances.get(r.from_user) ?? 0) - Number(r.total));
  }

  // Settlements recibidos (sumar)
  const toR = await c.query(
    `SELECT to_user, SUM(amount_cents) as total FROM settlements
     WHERE group_id = $1 AND status = 'confirmed' GROUP BY to_user`,
    [groupId],
  );
  for (const r of toR.rows) {
    balances.set(r.to_user, (balances.get(r.to_user) ?? 0) + Number(r.total));
  }

  console.log(`\n  Balances de "${label}":`);
  for (const m of membersR.rows) {
    const b = balances.get(m.id) ?? 0;
    const sign = b > 0 ? "+" : b < 0 ? "-" : " ";
    console.log(`    ${sign} ${m.name}: ${(b / 100).toFixed(2)} €`);
  }
}

async function seedMadridFlat(tu: string, user2: string, user3: string) {
  console.log("\n== Creando 'Piso de Madrid' (3 miembros) ==");
  const group = await createGroup("Piso de Madrid", tu);
  log(`group.id = ${group.id}`);
  log(`invite_code = ${group.invite_code}`);
  await addMember(group.id, tu);
  await addMember(group.id, user2);
  await addMember(group.id, user3);

  // Gasto 1: Alquiler 1200€ equal entre 3
  await createExpense(group.id, "Alquiler mes de julio", 120_000, tu, "equal", [
    { userId: tu },
    { userId: user2 },
    { userId: user3 },
  ]);
  log("Alquiler 1200€ equal");

  // Gasto 2: Compra del Mercadona 47,83€ exact (tu: 22,50, user2: 18,33, user3: 7,00)
  await createExpense(group.id, "Compra Mercadona", 4783, user2, "exact", [
    { userId: tu, amountCents: 2250 },
    { userId: user2, amountCents: 1833 },
    { userId: user3, amountCents: 700 },
  ]);
  log("Mercadona 47,83€ exact (22,50 + 18,33 + 7,00)");

  // Gasto 3: Internet 60€ percentage (tu 50%, user2 30%, user3 20%)
  await createExpense(group.id, "Fibra óptica", 6000, user3, "percentage", [
    { userId: tu, percentage: 50 },
    { userId: user2, percentage: 30 },
    { userId: user3, percentage: 20 },
  ]);
  log("Fibra 60€ percentage (50% + 30% + 20%)");

  // Gasto 4: Cena pizza 24€ solo entre tu y user2
  await createExpense(group.id, "Cena pizza viernes", 2400, tu, "equal", [
    { userId: tu },
    { userId: user2 },
  ]);
  log("Pizza 24€ equal (solo tu y user2)");

  // Settlement: user2 paga 30€ a tu (parte de su deuda)
  await createSettlement(group.id, user2, tu, 3000);
  log("Settlement: user2 → tu 30€");

  await showBalances(group.id, "Piso de Madrid");
}

async function seedBarcelonaDinners(tu: string, user2: string) {
  console.log("\n== Creando 'Cenas de Barcelona' (2 miembros) ==");
  const group = await createGroup("Cenas de Barcelona", tu);
  log(`group.id = ${group.id}`);
  log(`invite_code = ${group.invite_code}`);
  await addMember(group.id, tu);
  await addMember(group.id, user2);

  // Gasto 1: Cena 40€ equal
  await createExpense(group.id, "Cena vermut", 4000, tu, "equal", [
    { userId: tu },
    { userId: user2 },
  ]);
  log("Cena 40€ equal");

  // Gasto 2: Cervezas 13,50€ exact
  await createExpense(group.id, "Cervezas", 1350, user2, "exact", [
    { userId: tu, amountCents: 500 },
    { userId: user2, amountCents: 850 },
  ]);
  log("Cervezas 13,50€ exact (5,00 + 8,50)");

  // Settlement: user2 paga 15€ a tu (deja pequeña deuda pendiente)
  await createSettlement(group.id, user2, tu, 1500);
  log("Settlement: user2 → tu 15€");

  await showBalances(group.id, "Cenas de Barcelona");
}

async function seedSevillaTrip(tu: string, user2: string, user3: string) {
  console.log("\n== Creando 'Viaje a Sevilla' (3 miembros) ==");
  const group = await createGroup("Viaje a Sevilla", tu);
  log(`group.id = ${group.id}`);
  log(`invite_code = ${group.invite_code}`);
  await addMember(group.id, tu);
  await addMember(group.id, user2);
  await addMember(group.id, user3);

  // Gasto 1: Alojamiento Airbnb 195€ percentage (50% tu, 30% user2, 20% user3)
  await createExpense(group.id, "Airbnb 2 noches", 19500, tu, "percentage", [
    { userId: tu, percentage: 50 },
    { userId: user2, percentage: 30 },
    { userId: user3, percentage: 20 },
  ]);
  log("Airbnb 195€ percentage (50% + 30% + 20%)");

  // Gasto 2: Tren AVE 96€ exact
  await createExpense(group.id, "Tren AVE ida y vuelta", 9600, user2, "exact", [
    { userId: tu, amountCents: 3800 },
    { userId: user2, amountCents: 3800 },
    { userId: user3, amountCents: 2000 },
  ]);
  log("Tren 96€ exact (38 + 38 + 20)");

  // Gasto 3: Cena restaurante 72€ equal
  await createExpense(group.id, "Cena en Triana", 7200, tu, "equal", [
    { userId: tu },
    { userId: user2 },
    { userId: user3 },
  ]);
  log("Cena 72€ equal");

  // Gasto 4: Taxi aeropuerto 24,50€ exact
  await createExpense(group.id, "Taxi al aeropuerto", 2450, user3, "exact", [
    { userId: tu, amountCents: 1200 },
    { userId: user2, amountCents: 1250 },
  ]);
  log("Taxi 24,50€ exact (solo tu y user2)");

  // Settlement: user3 paga 50€ a tu
  await createSettlement(group.id, user3, tu, 5000);
  log("Settlement: user3 → tu 50€");

  await showBalances(group.id, "Viaje a Sevilla");
}

async function seedSubscriptions(tu: string, user2: string) {
  console.log("\n== Creando 'Spotify y Netflix' (2 miembros) ==");
  const group = await createGroup("Spotify y Netflix", tu);
  log(`group.id = ${group.id}`);
  log(`invite_code = ${group.invite_code}`);
  await addMember(group.id, tu);
  await addMember(group.id, user2);

  // Gasto 1: Netflix 17,99€ equal
  await createExpense(group.id, "Netflix julio", 1799, user2, "equal", [
    { userId: tu },
    { userId: user2 },
  ]);
  log("Netflix 17,99€ equal");

  // Gasto 2: Spotify 16,99€ exact
  await createExpense(group.id, "Spotify familiar", 1699, tu, "exact", [
    { userId: tu, amountCents: 1099 },
    { userId: user2, amountCents: 600 },
  ]);
  log("Spotify 16,99€ exact (10,99 + 6,00)");

  // Gasto 3: HBO Max 11,99€ percentage
  await createExpense(group.id, "HBO Max", 1199, user2, "percentage", [
    { userId: tu, percentage: 60 },
    { userId: user2, percentage: 40 },
  ]);
  log("HBO 11,99€ percentage (60% + 40%)");

  await showBalances(group.id, "Spotify y Netflix");
}

async function main() {
  console.log("== Seed de datos de ejemplo ==");
  const { byEmail } = await getUserIds();

  const tu = byEmail["tu@email.com"];
  const user2 = byEmail["user2@test.com"];
  const user3 = byEmail["user3@test.com"];

  if (!tu || !user2 || !user3) {
    console.error("Faltan usuarios base. Asegúrate de tener:");
    console.error("  - tu@email.com / password123");
    console.error("  - user2@test.com / password123");
    console.error("  - user3@test.com / password123");
    process.exit(1);
  }

  await wipe();
  await seedMadridFlat(tu, user2, user3);
  await seedBarcelonaDinners(tu, user2);
  await seedSevillaTrip(tu, user2, user3);
  await seedSubscriptions(tu, user2);

  console.log("\n== Hecho. Usuarios disponibles ==");
  console.log("  tu@email.com / password123");
  console.log("  user2@test.com / password123");
  console.log("  user3@test.com / password123");

  await c.end();
  await pool.end();
}

main().catch((err) => {
  console.error("Error durante el seed:", err);
  process.exit(1);
});
