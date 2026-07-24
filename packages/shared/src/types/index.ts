export type SplitMethod = "equal" | "exact" | "percentage";
export type SettlementStatus = "pending" | "confirmed";

export interface GroupSummary {
  id: string;
  name: string;
  memberCount: number;
}
