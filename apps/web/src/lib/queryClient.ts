import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos del grupo no cambian a cada segundo: un minuto
      // de freshness evita refetch al navegar entre páginas.
      staleTime: 60_000,
      // Si falla una vez, reintenta una vez. Más que eso satura
      // al usuario de toasts.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
