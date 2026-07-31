import { Check, Copy } from "lucide-react";
import type { GroupDetail } from "@/services/groups";
import type { GroupMember } from "@/services/members";
import { useGroupBalances } from "@/hooks/useGroupBalances";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { formatLongDate } from "@/lib/formatters";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { InviteStamp, SettledStamp } from "./Stamps";
import { TabTrigger } from "./TabTrigger";
import { SignersSection } from "./SignersSection";
import { ExpensesSection } from "./ExpensesSection";
import { BalancesSection } from "@/components/balances/BalancesSection";

/**
 * Orquesta del cuaderno de la cuenta: membrete con sello "Invita"
 * y bloque de invitación, índice de apartados (Firmantes / Apuntes /
 * Saldos) y el contenido de cada tab. Es la pieza más "pesada" de la
 * página pero sigue siendo presentacional: la carga del grupo y el
 * estado viven en GroupDetailPage, que es quien orquesta todo.
 */
export function Notebook({
  group,
  currentUserId,
  currentUserName,
  copied,
  onCopy,
  expenseFormOpen,
  onOpenExpenseForm,
  onCloseExpenseForm,
  activeTab,
  onActiveTabChange,
  counts,
  onCountChange,
}: {
  group: GroupDetail;
  currentUserId: string;
  currentUserName: string;
  copied: boolean;
  onCopy: () => void;
  expenseFormOpen: boolean;
  onOpenExpenseForm: () => void;
  onCloseExpenseForm: () => void;
  activeTab: "signers" | "expenses" | "balances";
  onActiveTabChange: (v: "signers" | "expenses" | "balances") => void;
  counts: { signers: number | null; expenses: number | null; balances: number | null };
  onCountChange: (
    key: "signers" | "expenses" | "balances",
    n: number | null,
  ) => void;
}) {
  const isOwner = group.createdBy === currentUserId;
  const membersQuery = useGroupMembers(group.id);
  const members = membersQuery.data ?? null;
  // TanStack Query deduplica por queryKey, así que esta llamada
  // reutiliza el cache que carga <Balances/> debajo. Sin fetch doble.
  const balancesQuery = useGroupBalances(group.id);
  const isSettled = balancesQuery.data?.isSettled;

  return (
    <main className="mt-10 sm:mt-12 space-y-6">
      <article className="receipt relative animate-print">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-7 pt-7 pb-6 sm:px-9">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/55">
                Cuenta
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.02] text-ink">
                {group.name}
              </h1>
              <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
                Abierta el {formatLongDate(group.createdAt)}
              </p>
              {isSettled && <SettledStamp />}
            </div>
            <InviteStamp copied={copied} onClick={onCopy} />
          </div>

          <div className="px-7 pt-6 pb-2 sm:px-9">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
              Invitación
            </p>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copiar código de invitación"
              className="mt-3 w-full flex items-center justify-between gap-3 border border-ink/15 border-dashed px-4 py-3 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors rounded-sm"
            >
              <span className="font-mono text-base tracking-[0.1em] text-ink/85">
                {formatInviteCodeLocal(group.inviteCode)}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                {copied ? (
                  <>
                    Copiado
                    <Check className="size-3.5 text-accent" strokeWidth={2.5} aria-hidden />
                  </>
                ) : (
                  <>
                    Copiar
                    <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                  </>
                )}
              </span>
            </button>
            <p className="mt-3 text-xs text-ink/55">
              Comparte este código para que alguien se una a la cuenta.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>
              {isOwner ? "Eres quien abrió esta cuenta." : "Te uniste a esta cuenta."}
            </span>
            <span className="font-mono tracking-wider">
              #{group.id.slice(0, 3).toUpperCase()}
            </span>
          </div>
        </div>
      </article>

      <Tabs
        value={activeTab}
        onValueChange={(v) => onActiveTabChange(v as typeof activeTab)}
        className="flex flex-col gap-4"
      >
        <TabsList
          variant="line"
          className="bg-transparent border-b border-ink/15 rounded-none p-0 h-auto justify-start gap-1 text-ink/55"
        >
          <TabTrigger value="signers" label="Firmantes" count={counts.signers} />
          <TabTrigger value="expenses" label="Apuntes" count={counts.expenses} />
          <TabTrigger value="balances" label="Saldos" count={counts.balances} />
        </TabsList>

        <TabsContent value="signers" className="mt-0 focus-visible:outline-none">
          <SignersSection
            group={group}
            currentUserId={currentUserId}
            members={members}
            membersLoading={membersQuery.isLoading}
            membersError={
              membersQuery.error ? (membersQuery.error as Error).message : null
            }
            onCountChange={(n) => onCountChange("signers", n)}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 focus-visible:outline-none">
          <ExpensesSection
            groupId={group.id}
            currentUserId={currentUserId}
            members={members}
            membersLoading={membersQuery.isLoading}
            membersError={
              membersQuery.error ? (membersQuery.error as Error).message : null
            }
            formOpen={expenseFormOpen}
            onOpenForm={onOpenExpenseForm}
            onCloseForm={onCloseExpenseForm}
            onCountChange={(n) => onCountChange("expenses", n)}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-0 focus-visible:outline-none">
          <BalancesSection
            groupId={group.id}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            members={(members ?? []) as GroupMember[]}
            onCountChange={(n) => onCountChange("balances", n)}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// `formatInviteCode` es una utilidad local del cuaderno: limpia el
// string y lo divide con un punto medio para legibilidad.
function formatInviteCodeLocal(raw: string) {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
}
