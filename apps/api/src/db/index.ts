import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check apps/api/.env");
}

// En Node, el driver WebSocket de Neon no está disponible por defecto.
// Lo registramos manualmente. En edge runtimes (Cloudflare, Vercel Edge)
// ya existe un WebSocket global y este paso se omite.
neonConfig.webSocketConstructor = ws;

// Pool con WebSocket: permite transacciones multi-query (BEGIN/COMMIT).
// Se reutiliza entre requests mientras el proceso esté vivo.
// max=10 es un buen default para dev; ajustar según concurrencia real.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

export const db = drizzle(pool, { schema });
export type Database = typeof db;
