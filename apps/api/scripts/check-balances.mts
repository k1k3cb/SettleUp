import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const groupId = process.argv[2];
if (!groupId) {
  console.error("Uso: tsx scripts/check-balances.mts <groupId>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  console.log("=== Gastos pagados por usuario ===");
  const r1 = await c.query(
    `SELECT paid_by, SUM(amount_cents) as total
     FROM expenses
     WHERE group_id = $1 AND is_cancelled = false
     GROUP BY paid_by`,
    [groupId]
  );
  console.log(r1.rows);

  console.log("=== Splits adeudados por usuario ===");
  const r2 = await c.query(
    `SELECT es.user_id, SUM(es.owed_amount_cents) as total
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1 AND e.is_cancelled = false
     GROUP BY es.user_id`,
    [groupId]
  );
  console.log(r2.rows);

  console.log("=== Conteo de filas en expense_splits ===");
  const r3 = await c.query(
    `SELECT COUNT(*) as n FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1 AND e.is_cancelled = false`,
    [groupId]
  );
  console.log(r3.rows);
} finally {
  await c.end();
  await pool.end();
}
