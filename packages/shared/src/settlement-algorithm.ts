import type { Cents } from "./money";

export interface MemberBalance {
  memberId: string;
  balanceCents: Cents;
}

export interface SuggestedTransfer {
  fromMemberId: string;
  toMemberId: string;
  amountCents: Cents;
}

export function calculateSuggestedTransfers(
  balances: MemberBalance[]
): SuggestedTransfer[] {
  const debtors = balances
    .filter((balance) => balance.balanceCents < 0)
    .map((balance) => ({ ...balance, balanceCents: Math.abs(balance.balanceCents) }))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const creditors = balances
    .filter((balance) => balance.balanceCents > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const transfers: SuggestedTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.balanceCents, creditor.balanceCents);

    if (amountCents > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountCents
      });
    }

    debtor.balanceCents -= amountCents;
    creditor.balanceCents -= amountCents;

    if (debtor.balanceCents === 0) debtorIndex += 1;
    if (creditor.balanceCents === 0) creditorIndex += 1;
  }

  return transfers;
}
