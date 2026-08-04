import type { Server as IOServer } from "socket.io";

/**
 * Emisor de eventos de tiempo real. Se inyecta desde `server.ts`
 * al crear el Socket.IO server. Si no hay servidor (tests, build),
 * los `emit*` son no-op para que los servicios no se acoplen al
 * transporte.
 *
 * Salas: una por `groupId`. Solo los miembros del grupo deberían
 * estar en la sala — la autorización la hace el consumidor del
 * emitter en cada `emit*` (no se filtra aquí para no duplicar
 * queries de "este user es miembro de este grupo?").
 */
export interface RealtimeEmitter {
  emitExpenseCreated(groupId: string): void;
  emitExpenseCancelled(groupId: string): void;
  emitSettlementCreated(groupId: string): void;
  emitSettlementCancelled(groupId: string): void;
  emitMembersChanged(groupId: string): void;
}

const noop = (groupId: string) => groupId;

class NoopEmitter implements RealtimeEmitter {
  emitExpenseCreated = noop;
  emitExpenseCancelled = noop;
  emitSettlementCreated = noop;
  emitSettlementCancelled = noop;
  emitMembersChanged = noop;
}

class SocketIoEmitter implements RealtimeEmitter {
  constructor(private readonly io: IOServer) {}

  private emit(groupId: string, event: string) {
    this.io.to(`group:${groupId}`).emit(event);
  }

  emitExpenseCreated(groupId: string) {
    this.emit(groupId, "expense:created");
  }
  emitExpenseCancelled(groupId: string) {
    this.emit(groupId, "expense:cancelled");
  }
  emitSettlementCreated(groupId: string) {
    this.emit(groupId, "settlement:created");
  }
  emitSettlementCancelled(groupId: string) {
    this.emit(groupId, "settlement:cancelled");
  }
  emitMembersChanged(groupId: string) {
    this.emit(groupId, "members:changed");
  }
}

let emitter: RealtimeEmitter = new NoopEmitter();

export function getRealtime(): RealtimeEmitter {
  return emitter;
}

export function setRealtime(io: IOServer | null): void {
  emitter = io ? new SocketIoEmitter(io) : new NoopEmitter();
}
