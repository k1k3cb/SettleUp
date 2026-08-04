import { db } from "../src/db/index.js";
import { user, groups, groupMembers, expenses, expenseSplits, settlements } from "../src/db/schema/index.js";
import { eq, and, ne, inArray } from "drizzle-orm";

const demoUser = (await db.select().from(user).where(eq(user.email, "demo@settleup.dev")))[0];
if (!demoUser) {
  console.error("Demo user not found");
  process.exit(1);
}

// 1. Delete ALL groups where demo is creator
const myGroups = await db.select().from(groups).where(eq(groups.createdBy, demoUser.id));
const myGroupIds = myGroups.map((g) => g.id);
console.log("Demo groups to delete:", myGroups.map(g => g.name));

// Delete expenses + splits for these groups
const myExps = await db.select().from(expenses).where(inArray(expenses.groupId, myGroupIds));
const myExpIds = myExps.map((e) => e.id);
if (myExpIds.length > 0) {
  await db.delete(expenseSplits).where(inArray(expenseSplits.expenseId, myExpIds));
}
await db.delete(expenses).where(inArray(expenses.groupId, myGroupIds));
await db.delete(settlements).where(inArray(settlements.groupId, myGroupIds));
await db.delete(groupMembers).where(inArray(groupMembers.groupId, myGroupIds));
await db.delete(groups).where(inArray(groups.id, myGroupIds));
console.log("Deleted all demo groups");

// 2. Now find the 4-member set (any existing group with all demo's roomies)
const lucia = (await db.select().from(user).where(eq(user.email, "lucia@settleup.dev")))[0];
const marco = (await db.select().from(user).where(eq(user.email, "marco@settleup.dev")))[0];
const sara = (await db.select().from(user).where(eq(user.email, "sara@settleup.dev")))[0];
const memberSet = [demoUser.id, lucia.id, marco.id, sara.id];
console.log("Member set:", memberSet.map((u) => u.slice(0, 8)));

function id() {
  return crypto.randomUUID();
}
function inviteCode() {
  return Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

async function createGroup(name: string, daysAgo: number) {
  const g = (
    await db
      .insert(groups)
      .values({
        id: id(),
        name,
        createdBy: demoUser.id,
        inviteCode: inviteCode(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * daysAgo),
      })
      .returning()
  )[0];
  for (const uid of memberSet) {
    await db.insert(groupMembers).values({
      id: id(),
      groupId: g.id,
      userId: uid,
      joinedAt: new Date(),
    });
  }
  return g;
}

async function addExpense(groupId: string, desc: string, amount: number, payer: string, daysAgo: number) {
  const exp = (
    await db
      .insert(expenses)
      .values({
        id: id(),
        groupId,
        description: desc,
        amountCents: amount,
        currency: "EUR",
        paidBy: payer,
        splitMethod: "equal",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * daysAgo),
      })
      .returning()
  )[0];
  const perPerson = Math.floor(amount / memberSet.length);
  for (const uid of memberSet) {
    await db.insert(expenseSplits).values({
      id: id(),
      expenseId: exp.id,
      userId: uid,
      owedAmountCents: perPerson,
    });
  }
  return exp;
}

// === Group 1: Piso de Madrid (active, 5 expenses) ===
const g1 = await createGroup("Piso de Madrid", 30);
await addExpense(g1.id, "Compra Mercadona", 8430, demoUser.id, 5);
await addExpense(g1.id, "Luz y agua (reciba)", 6200, memberSet[1], 10);
await addExpense(g1.id, "Cena en Casa Pepe", 4500, memberSet[2], 3);
await addExpense(g1.id, "Papel higiénico x12", 1200, memberSet[3], 7);
await addExpense(g1.id, "Internet + Netflix", 4900, demoUser.id, 2);
console.log("Created Piso de Madrid with 5 expenses");

// === Group 2: Viaje a Sevilla (pending, 2 expenses) ===
const g2 = await createGroup("Viaje a Sevilla", 14);
await addExpense(g2.id, "Airbnb 3 noches", 36000, demoUser.id, 6);
await addExpense(g2.id, "Cena de tapeo", 7800, memberSet[1], 4);
console.log("Created Viaje a Sevilla with 2 expenses");

// === Group 3: Cenas de Barcelona (will be settled) ===
const g3 = await createGroup("Cenas de Barcelona", 21);
const exp1 = await addExpense(g3.id, "Cena en Bar Cañete", 9200, memberSet[1], 8);
const exp2 = await addExpense(g3.id, "Vino y queso", 2800, demoUser.id, 5);

// Compute and add settlements to fully settle
const balances: Record<string, number> = {};
for (const uid of memberSet) balances[uid] = 0;
balances[exp1.paidBy] += exp1.amountCents;
balances[exp2.paidBy] += exp2.amountCents;
for (const e of [exp1, exp2]) {
  const perPerson = Math.floor(e.amountCents / memberSet.length);
  for (const uid of memberSet) {
    balances[uid] -= perPerson;
  }
}
console.log("\nCenas balances before settle:", balances);

// Settle
const debtors = Object.entries(balances).filter(([, b]) => b < 0);
const creditors = Object.entries(balances).filter(([, b]) => b > 0);
const remaining = { ...balances };
for (const [debtor, debt] of debtors) {
  for (const [creditor, credit] of creditors) {
    if (remaining[creditor] <= 0) continue;
    const amount = Math.min(-debt, remaining[creditor]);
    if (amount > 0) {
      await db.insert(settlements).values({
        id: id(),
        groupId: g3.id,
        fromUser: debtor,
        toUser: creditor,
        amountCents: amount,
        status: "confirmed",
        createdAt: new Date(),
        confirmedAt: new Date(),
      });
      remaining[debtor] += amount;
      remaining[creditor] -= amount;
      console.log(`  ${debtor.slice(0, 8)} → ${creditor.slice(0, 8)}: ${amount}`);
    }
  }
}
console.log("Created Cenas de Barcelona (settled)");

console.log("\n✓ All demo data ready");
process.exit(0);
