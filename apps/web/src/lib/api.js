const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export class ApiError extends Error {
    status;
    details;
    constructor(message, status, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
export async function api(method, path, body) {
    const res = await fetch(`${apiBase}${path}`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204)
        return undefined;
    const data = (await res.json().catch(() => ({})));
    if (!res.ok) {
        throw new ApiError(data.message ?? "Algo ha ido mal. Inténtalo de nuevo.", res.status, data.details);
    }
    return (data.data ?? data);
}
