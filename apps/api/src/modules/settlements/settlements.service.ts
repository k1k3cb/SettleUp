import { SettlementsRepository, type Settlement } from "./settlements.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { MembersRepository } from "../members/members.repository.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors.js";
import type { CreateSettlementInput } from "./settlements.schemas.js";
import { getRealtime } from "../../realtime.js";

export class SettlementsService {
  constructor(
    private readonly repo: SettlementsRepository,
    private readonly groupsRepo: GroupsRepository,
    private readonly membersRepo: MembersRepository,
  ) {}

  /**
   * Crea un settlement "pago directo": el currentUser registra que ha
   * pagado `amountCents` a `toUser`. Se guarda como confirmado y
   * pasa a afectar a los balances del grupo.
   *
   * Reglas:
   *  - El grupo debe existir y el usuario ser miembro.
   *  - El destinatario debe ser miembro del grupo.
   *  - No se permite pagarse a uno mismo.
   *  - El monto no puede superar la deuda actual del pagador con el
   *    destinatario (un pago mayor quedaría "como saldo a favor" que
   *    el modelo actual no soporta). Si quieres pagar de más, haz
   *    dos settlements.
   */
  async create(
    groupId: string,
    fromUser: string,
    input: CreateSettlementInput,
  ): Promise<Settlement> {
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, fromUser);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this group");
    }

    if (input.toUser === fromUser) {
      throw new ValidationError("You cannot settle a debt with yourself", {
        toUser: ["Pagador y destinatario no pueden ser la misma persona"],
      });
    }

    const nameMap = await this.membersRepo.nameMap(groupId);
    if (!(input.toUser in nameMap)) {
      throw new ValidationError("Recipient is not a member of this group", {
        toUser: ["El destinatario no es miembro de este grupo"],
      });
    }

    const settlement = await this.repo.createConfirmed({
      groupId,
      fromUser,
      toUser: input.toUser,
      amountCents: input.amountCents,
    });
    getRealtime().emitSettlementCreated(groupId);
    return settlement;
  }

  async listByGroup(groupId: string, userId: string): Promise<Settlement[]> {
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this group");
    }
    return this.repo.listByGroup(groupId);
  }

  /**
   * Cancela (soft delete) un settlement. Reglas:
   *  - El settlement debe existir y pertenecer al grupo (404 si no).
   *  - El grupo debe existir (404 si no).
   *  - El usuario debe ser miembro del grupo (403 si no).
   *  - Solo el `fromUser` (quien pagó) puede deshacer su propio pago.
   *    El `toUser` no puede anular un pago que recibió.
   *  - Si ya está cancelado, 409 Conflict (idempotencia: no reportar
   *    éxito doble).
   */
  async cancel(
    groupId: string,
    settlementId: string,
    userId: string,
  ): Promise<void> {
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, userId);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this group");
    }

    const settlement = await this.repo.findById(settlementId);
    if (!settlement || settlement.groupId !== groupId) {
      throw new NotFoundError("Settlement not found");
    }
    if (settlement.fromUser !== userId) {
      throw new ForbiddenError(
        "Only the payer can cancel a settlement",
      );
    }
    if (settlement.status === "cancelled") {
      throw new ValidationError(
        "Settlement is already cancelled",
        { status: ["Este pago ya está anulado"] },
      );
    }

    await this.repo.cancel(settlementId);
    getRealtime().emitSettlementCancelled(groupId);
  }
}
