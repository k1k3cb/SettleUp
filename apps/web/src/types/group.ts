export type Group = {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  createdAt: string;
};

export type Member = {
  userId: string;
  name: string;
  joinedAt: string;
};

export type BalanceEntry = {
  userId: string;
  name: string;
  amountCents: number;
};

export type Transfer = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
};

export type GroupBalances = {
  balances: BalanceEntry[];
  transfers: Transfer[];
  myBalanceCents: number;
};
