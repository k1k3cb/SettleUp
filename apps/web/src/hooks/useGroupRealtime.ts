import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { wsEnabled, wsUrl } from "@/lib/env";
import { expensesKeys } from "./useCreateExpense";
import { balancesKeys } from "./useGroupBalances";
import { settlementsKeys } from "./useSettlements";
import { membersKeys } from "./useGroupMembers";

const POLL_INTERVAL_MS = 15_000;

/**
 * Sincroniza el estado del grupo con el servidor en tiempo real.
 *
 * En local (con `VITE_WS_URL`): abre un socket y reacciona a eventos
 * puntuales (`expense:created`, `settlement:created`, etc.) tocando
 * solo las queries afectadas.
 *
 * En producción (sin `VITE_WS_URL`, p. ej. en Vercel): cae a un
 * polling de 15s que invalida las queries del grupo entero. Sigue
 * siendo reactivo para el usuario, sin necesitar servidor persistente.
 *
 * Decisión: misma API en ambos modos. Los consumidores no saben
 * (ni les importa) qué transporte está por debajo.
 */
export function useGroupRealtime(groupId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    if (wsEnabled) {
      return attachWebSocket(qc, groupId);
    }
    return attachPolling(qc, groupId);
  }, [groupId, qc]);
}

function attachWebSocket(qc: ReturnType<typeof useQueryClient>, groupId: string) {
  const socket: Socket = io(wsUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  const join = () => socket.emit("group:join", { groupId });

  socket.on("connect", join);
  // Si la reconexión llega antes que la sesión del server, el join
  // se reintenta solo.
  socket.io.on("reconnect", join);

  socket.on("expense:created", () => {
    qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
  });

  socket.on("expense:cancelled", () => {
    qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
  });

  socket.on("settlement:created", () => {
    qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
  });

  socket.on("settlement:cancelled", () => {
    qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
  });

  socket.on("members:changed", () => {
    qc.invalidateQueries({ queryKey: membersKeys.byGroup(groupId) });
  });

  return () => {
    socket.emit("group:leave", { groupId });
    socket.disconnect();
  };
}

function attachPolling(qc: ReturnType<typeof useQueryClient>, groupId: string) {
  const tick = () => {
    qc.invalidateQueries({ queryKey: expensesKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: balancesKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: settlementsKeys.byGroup(groupId) });
    qc.invalidateQueries({ queryKey: membersKeys.byGroup(groupId) });
  };

  const id = window.setInterval(tick, POLL_INTERVAL_MS);
  return () => window.clearInterval(id);
}
