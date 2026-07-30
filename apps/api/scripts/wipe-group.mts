import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const groupId = process.argv[2];
const action = process.argv[3]; // "preview" | "wipe-expenses" | "wipe-settlements" | "wipe-all"
if (!groupId || !action) {
  console.error("Uso: tsx scripts/wipe-group.mts <groupId> <preview|wipe-expenses|wipe-settlements|wipe-all>");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

const exp = await c.query(
  "SELECT COUNT(*) as n FROM expenses WHERE group_id = $1",
  [groupId]
);
const sett = await c.query(
  "SELECT status, COUNT(*) as n FROM settlements WHERE group_id = $1 GROUP BY status",
  [groupId]
);
console.log("=== Estado actual ===");
console.log(`  expenses: ${exp.rows[0].n}`);
for (const row of sett.rows) {
  console.log(`  settlements (${row.status}): ${row.n}`);
}

if (action === "preview") {
  await c.end();
  await pool.end();
} else if (action.startsWith("wipe-")) {
  console.log(`\nATENCIÓN: vas a ejecutar ${action}.`);
  console.log("Para confirmar, ejecuta con 'force' como cuarto argumento.");
  const force = process.argv[4];
  if (force !== "force") {
    console.log("Abortando (sin 'force').");
  } else {
    if (action === "wipe-expenses" || action === "wipe-all") {
      // expense_splits se borra por CASCADE
      await c.query("DELETE FROM expenses WHERE group_id = $1", [groupId]);
      console.log("  expenses borrados (splits en cascada).");
    }
    if (action === "wipe-settlements" || action === "wipe-all") {
      await c.query("DELETE FROM settlements WHERE group_id = $1", [groupId]);
      console.log("  settlements borrados.");
    }
    console.log("\nHecho.");
  }
  await c.end();
  await pool.end();
}
