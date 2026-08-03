import { createAuthClient } from "better-auth/react";
const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const authClient = createAuthClient({
    baseURL: `${apiBase}/api/auth`,
    fetchOptions: {
        credentials: "include",
    },
});
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
