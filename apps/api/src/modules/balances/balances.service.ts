import { BalancesRepository } from "./balances.repository.js";
import { MembersRepository } from "../members/members.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import { NotFoundError, ForbiddenError } from "../../utils/errors.js";
import {
  getSuggestedSettlements,
  type Balance,
  type SuggestedTransfer,
} from "./debtSimplifier.js";

export type BalanceView = {
  userId: string;
  name: string;
  amountCents: number;
};

export type TransferView = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
};

export type GroupBalances = {
  balances: BalanceView[]; // una entrada por miembro (con amountCents=0 si está saldado)
  transfers: TransferView[]; // transferencias simplificadas greedy
  myBalanceCents: number; // balance del currentUser, convenience
};

export class BalancesService {
  constructor(
    private readonly repo: BalancesRepository,
    private readonly membersRepo: MembersRepository,
    private readonly groupsRepo: GroupsRepository,
  ) {}

  async getGroupBalances(
    groupId: string,
    currentUserId: string
  ): Promise<GroupBalances> {
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, currentUserId);
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this group");
    }

    // 1. Query agregada de balances netos
    const rawBalances = await this.repo.getNetBalances(groupId);

    // 2. Nombres para presentar al cliente
    const nameMap = await this.membersRepo.nameMap(groupId);

    // 3. Construir vista de balances (un miembro puede tener 0 — los incluimos)
    const balances: BalanceView[] = Object.entries(nameMap).map(
      ([userId, name]) => ({
        userId,
        name,
        amountCents: rawBalances[userId] ?? 0,
      })
    );

    // 4. Aplicar simplificación de deudas sobre los balances crudos
    const rawForSimplifier: Record<string, number> = {};
    for (const b of balances) {
      if (b.amountCents !== 0) rawForSimplifier[b.userId] = b.amountCents;
    }
    const transfers: SuggestedTransfer[] = getSuggestedSettlements(
      rawForSimplifier
    );

    // 5. Decorar transfers con nombres
    const transferViews: TransferView[] = transfers.map((t) => ({
      fromUserId: t.fromUserId,
      fromName: nameMap[t.fromUserId] ?? t.fromUserId,
      toUserId: t.toUserId,
      toName: nameMap[t.toUserId] ?? t.toUserId,
      amountCents: t.amountCents,
    }));

    return {
      balances,
      transfers: transferViews,
      myBalanceCents: rawBalances[currentUserId] ?? 0,
    };
  }
}
