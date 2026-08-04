import { db } from "../src/db/index.js";
import { user, groups, groupMembers, expenses, expenseSplits, settlements } from "../src/db/schema/index.js";
import { eq, and } from "drizzle-orm";

const demoUser = (await db.select().from(user).where(eq(user.email, "demo@settleup.dev")))[0];

const allGroups = await db.select().from(groups);
for (const g of allGroups) {
  if (g.createdBy !== demoUser.id) continue;
  const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, g.id));
  const exps = await db.select().from(expenses).where(and(eq(expenses.groupId, g.id), eq(expenses.isCancelled, false)));
  const allSplits = await db.select().from(expenseSplits);
  const sets = await db.select().from(settlements).where(eq(settlements.groupId, g.id));

  console.log(`\n${g.name} (${members.length} members, ${exps.length} expenses, ${sets.length} settlements)`);

  const balances: Record<string, number> = {};
  for (const m of members) balances[m.userId] = 0;
  for (const e of exps) {
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amountCents;
  }
  for (const s of allSplits) {
    const exp = exps.find((e) => e.id === s.expenseId);
    if (exp) balances[s.userId] = (balances[s.userId] || 0) - s.owedAmountCents;
  }
  for (const s of sets) {
    if (s.status === "confirmed") {
      balances[s.fromUser] = (balances[s.fromUser] || 0) + s.amountCents;
      balances[s.toUser] = (balances[s.toUser] || 0) - s.amountCents;
    }
  }
  for (const [uid, bal] of Object.entries(balances)) {
    const name = members.find((m) => m.userId === uid);
    console.log(`  ${(name?.userId ?? "").slice(0, 8)}: ${bal} cents`);
  }
  const allZero = Object.values(balances).every((b) => b === 0);
  console.log(`  isSettled: ${allZero}`);
}

process.exit(0);
