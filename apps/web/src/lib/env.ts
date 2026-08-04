const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const wsUrl = import.meta.env.VITE_WS_URL ?? apiBase;
export const wsEnabled = !!import.meta.env.VITE_WS_URL;
