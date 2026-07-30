import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const groupId = process.argv[2];
if (!groupId) {
  console.error("Uso: tsx scripts/check-settlements.mts <groupId>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

try {
  console.log("=== Todos los settlements del grupo (sin filtro) ===");
  const r = await c.query(
    `SELECT id, from_user, to_user, amount_cents, status, created_at, confirmed_at
     FROM settlements
     WHERE group_id = $1
     ORDER BY created_at`,
    [groupId]
  );
  console.log(JSON.stringify(r.rows, null, 2));

  console.log("=== Suma de settlements por status ===");
  const r2 = await c.query(
    `SELECT status, SUM(amount_cents) as total, COUNT(*) as n
     FROM settlements
     WHERE group_id = $1
     GROUP BY status`,
    [groupId]
  );
  console.log(r2.rows);
} finally {
  await c.end();
  await pool.end();
}
