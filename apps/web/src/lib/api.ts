const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function api<T = unknown>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    data?: T;
    message?: string;
    details?: Record<string, string[]>;
  };

  if (!res.ok) {
    throw new ApiError(
      data.message ?? "Algo ha ido mal. Inténtalo de nuevo.",
      res.status,
      data.details,
    );
  }

  return (data.data ?? (data as T)) as T;
}
