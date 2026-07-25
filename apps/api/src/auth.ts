import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema/index.js";

export const auth = betterAuth({
  appName: "SettleUp",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 días
    updateAge: 60 * 60 * 24,       // refresh una vez al día
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,              // 5 min de cache en cookie
    },
  },
  trustedOrigins: [
    process.env.CLIENT_URL ?? "http://localhost:5173",
  ],
  advanced: {
    cookiePrefix: "settleup",
  },
});

export type Auth = typeof auth;
