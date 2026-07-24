import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check apps/api/.env");
}

// En Node, el cliente HTTP funciona directamente (no requiere `ws`).
// Si en el futuro se necesita `Pool` (WebSockets, transacciones multi-query),
// se importa desde "drizzle-orm/neon-serverless" y se pasa `Pool` aquí.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
