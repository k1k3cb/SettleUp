import { ExpensesRepository, type Expense, type ExpenseSplit } from "./expenses.repository.js";
import { GroupsRepository } from "../groups/groups.repository.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "../../utils/errors.js";
import type { CreateExpenseInput } from "./expenses.schemas.js";
import { getRealtime } from "../../realtime.js";

export type ExpenseWithSplits = Expense & { splits: ExpenseSplit[] };

export class ExpensesService {
  constructor(
    private readonly repo: ExpensesRepository,
    private readonly groupsRepo: GroupsRepository,
  ) {}

  async create(
    groupId: string,
    userId: string,
    input: CreateExpenseInput,
  ): Promise<ExpenseWithSplits> {
    // 1. El grupo debe existir
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");

    // 2. Quien crea el gasto debe ser miembro
    const isMember = await this.groupsRepo.isMember(groupId, userId);
    if (!isMember) throw new ForbiddenError("You are not a member of this group");

    // 3. Obtener todos los miembros del grupo
    const memberIds = await this.repo.getMemberIds(groupId);
    if (memberIds.length === 0) {
      throw new ValidationError("Group has no members");
    }
    const memberSet = new Set(memberIds);

    // 4. paidBy debe ser miembro del grupo
    if (!memberSet.has(input.paidBy)) {
      throw new ValidationError("paidBy must be a member of the group", {
        paidBy: ["Payer is not a member of this group"],
      });
    }

    // 5. Calcular splits según método
    const splitRows = this.computeSplits(input, memberIds, memberSet);

    // 6. Crear expense + splits en transacción
    const { expense, splits: createdSplits } = await this.repo.createWithSplits(
      {
        groupId,
        description: input.description,
        amountCents: input.amountCents,
        currency: input.currency,
        paidBy: input.paidBy,
        splitMethod: input.splitMethod,
      },
      splitRows,
    );

    // 7. Avisar a los demás miembros del grupo que hay un gasto nuevo.
    getRealtime().emitExpenseCreated(groupId);

    return { ...expense, splits: createdSplits };
  }

  async listByGroup(
    groupId: string,
    userId: string,
  ): Promise<ExpenseWithSplits[]> {
    // El grupo debe existir y el user ser miembro
    const group = await this.groupsRepo.findById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    const isMember = await this.groupsRepo.isMember(groupId, userId);
    if (!isMember) throw new ForbiddenError("You are not a member of this group");

    const expensesList = await this.repo.listByGroup(groupId);
    const ids = expensesList.map((e) => e.id);
    const splitsMap = await this.repo.splitsByExpenseIds(ids);

    return expensesList.map((e) => ({
      ...e,
      splits: splitsMap.get(e.id) ?? [],
    }));
  }

  async softDelete(
    groupId: string,
    expenseId: string,
    userId: string,
  ): Promise<void> {
    const expense = await this.repo.findById(expenseId);
    if (!expense || expense.groupId !== groupId) {
      throw new NotFoundError("Expense not found");
    }
    if (expense.isCancelled) {
      throw new ConflictError("Expense is already cancelled");
    }
    // Regla de producto: solo quien pagó puede cancelar el gasto.
    // (Cualquiera del grupo podría editarlo en una iteración futura.)
    if (expense.paidBy !== userId) {
      throw new ForbiddenError("Only the payer can cancel an expense");
    }
    await this.repo.softDelete(expenseId);
    getRealtime().emitExpenseCancelled(groupId);
  }

  // ---------- Cálculo de splits ----------

  private computeSplits(
    input: CreateExpenseInput,
    memberIds: string[],
    memberSet: Set<string>,
  ): Array<{ userId: string; owedAmountCents: number }> {
    switch (input.splitMethod) {
      case "equal":
        return this.computeEqual(input, memberIds, memberSet);
      case "exact":
        return this.computeExact(input, memberSet);
      case "percentage":
        return this.computePercentage(input, memberSet);
    }
  }

  private computeEqual(
    input: Extract<CreateExpenseInput, { splitMethod: "equal" }>,
    memberIds: string[],
    memberSet: Set<string>,
  ): Array<{ userId: string; owedAmountCents: number }> {
    // Si el frontend mandó lista explícita, usamos esa.
    // Si no, dividimos entre TODOS los miembros del grupo.
    const participants = input.splits.length > 0
      ? input.splits.map((s) => s.userId)
      : memberIds;

    if (participants.length === 0) {
      throw new ValidationError("No participants to split between");
    }
    for (const userId of participants) {
      if (!memberSet.has(userId)) {
        throw new ValidationError(
          "All split participants must be members of the group",
          { splits: [`User ${userId} is not a member of this group`] },
        );
      }
    }

    // División entera + el último se lleva el remanente para que sume exacto
    const total = input.amountCents;
    const base = Math.floor(total / participants.length);
    const remainder = total - base * participants.length;

    return participants.map((userId, index) => ({
      userId,
      owedAmountCents: base + (index === 0 ? remainder : 0),
    }));
  }

  private computeExact(
    input: Extract<CreateExpenseInput, { splitMethod: "exact" }>,
    memberSet: Set<string>,
  ): Array<{ userId: string; owedAmountCents: number }> {
    const total = input.splits.reduce((sum, s) => sum + s.amountCents, 0);
    if (total !== input.amountCents) {
      throw new ValidationError(
        "The sum of split amounts must equal the expense total",
        {
          splits: [
            `Split amounts sum to ${total} cents but expense is ${input.amountCents} cents`,
          ],
        },
      );
    }
    for (const s of input.splits) {
      if (!memberSet.has(s.userId)) {
        throw new ValidationError(
          "All split participants must be members of the group",
          { splits: [`User ${s.userId} is not a member of this group`] },
        );
      }
    }
    return input.splits.map((s) => ({
      userId: s.userId,
      owedAmountCents: s.amountCents,
    }));
  }

  private computePercentage(
    input: Extract<CreateExpenseInput, { splitMethod: "percentage" }>,
    memberSet: Set<string>,
  ): Array<{ userId: string; owedAmountCents: number }> {
    // Suma estricta: debe ser exactamente 100.
    const totalPct = input.splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.0001) {
      throw new ValidationError(
        "Percentages must sum to exactly 100",
        {
          splits: [
            `Percentages sum to ${totalPct}% but must equal 100%`,
          ],
        },
      );
    }
    for (const s of input.splits) {
      if (!memberSet.has(s.userId)) {
        throw new ValidationError(
          "All split participants must be members of the group",
          { splits: [`User ${s.userId} is not a member of this group`] },
        );
      }
    }

    // Conversión a centavos. El último se lleva el remanente para que
    // la suma de owedAmountCents sea exactamente input.amountCents.
    const total = input.amountCents;
    const result: Array<{ userId: string; owedAmountCents: number }> = [];
    let assigned = 0;
    for (let i = 0; i < input.splits.length; i++) {
      const s = input.splits[i]!;
      const isLast = i === input.splits.length - 1;
      const cents = isLast
        ? total - assigned
        : Math.floor((s.percentage / 100) * total);
      result.push({ userId: s.userId, owedAmountCents: cents });
      assigned += cents;
    }
    return result;
  }
}
