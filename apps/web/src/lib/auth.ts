import { createAuthClient } from "better-auth/react";

const baseURL =
  import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/auth`
    : "http://localhost:4000/api/auth";

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
