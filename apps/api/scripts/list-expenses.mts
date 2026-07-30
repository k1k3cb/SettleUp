import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const groupId = process.argv[2];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();

const r = await c.query(
  "SELECT id, description, amount_cents, is_cancelled, created_at FROM expenses WHERE group_id = $1 ORDER BY created_at",
  [groupId]
);
console.log(`Total rows: ${r.rows.length}`);
for (const row of r.rows) {
  console.log(
    `  ${row.created_at} | ${row.amount_cents}c | is_cancelled=${row.is_cancelled} | ${row.description}`
  );
}

await c.end();
await pool.end();
