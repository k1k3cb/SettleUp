import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { groupsService, type GroupDetail } from "@/services/groups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { useCancelExpense } from "@/hooks/useCancelExpense";
import { useGroupBalances } from "@/hooks/useGroupBalances";
import { useCreateSettlement, useDeleteSettlement, useGroupSettlements } from "@/hooks/useSettlements";
import type { GroupMember } from "@/services/members";
import type { ExpenseWithSplits } from "@/services/expenses";
import { ApiError } from "@/lib/api";
import {
  formatCents,
  formatLongDate,
  formatShortDate,
} from "@/lib/formatters";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseDetailsSheet } from "@/components/expenses/ExpenseDetailsSheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const formatInviteCode = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
};

// Re-export local con el nombre histórico de la página, para no
// reescribir todos los call sites. `formatCreatedAt === formatLongDate`.
const formatCreatedAt = formatLongDate;

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<{
    kind: "load" | "notfound" | "forbidden";
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"signers" | "expenses" | "balances">(
    "signers",
  );
  const [counts, setCounts] = useState<{
    signers: number | null;
    expenses: number | null;
    balances: number | null;
  }>({ signers: null, expenses: null, balances: null });

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      navigate("/signin", { replace: true });
      return;
    }
    if (!id) {
      setError({
        kind: "notfound",
        message: "Falta el identificador del grupo.",
      });
      return;
    }
    void load(id);
  }, [id, isPending, session, navigate]);

  const load = async (groupId: string) => {
    setError(null);
    setGroup(null);
    try {
      const data = await groupsService.get(groupId);
      setGroup(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError({ kind: "notfound", message: "No existe esa cuenta." });
        } else if (err.status === 403) {
          setError({
            kind: "forbidden",
            message: "No formas parte de esta cuenta.",
          });
        } else {
          setError({ kind: "load", message: err.message });
        }
      } else {
        setError({
          kind: "load",
          message: "No hemos podido abrir la cuenta.",
        });
      }
    }
  };

  const onCopy = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard no disponible */
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45">
          Comprobando…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Header
          onSignOut={async () => {
            await signOut();
            navigate("/signin", { replace: true });
          }}
        />

        {error ? (
          <ErrorState
            kind={error.kind}
            message={error.message}
            onBack={() => navigate("/groups")}
            onRetry={id ? () => load(id) : undefined}
          />
        ) : group ? (
          <Notebook
            group={group}
            currentUserId={session.user.id}
            currentUserName={session.user.name}
            copied={copied}
            onCopy={onCopy}
            expenseFormOpen={expenseFormOpen}
            onOpenExpenseForm={() => setExpenseFormOpen(true)}
            onCloseExpenseForm={() => setExpenseFormOpen(false)}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            counts={counts}
            onCountChange={(key, n) =>
              setCounts((prev) => ({ ...prev, [key]: n }))
            }
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </div>
  );
}

function Header({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-baseline justify-between">
      <nav
        aria-label="Migas"
        className="flex items-baseline gap-2 font-mono text-[10px] tracking-[0.18em] uppercase"
      >
        <Link
          to="/"
          className="text-ink/70 hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm"
        >
          SettleUp
        </Link>
        <span aria-hidden className="text-ink/30">/</span>
        <Link
          to="/groups"
          className="group inline-flex items-center gap-1.5 text-ink/55 hover:text-ink transition-colors"
        >
          <ArrowLeft
            className="size-3 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
          Cuentas
        </Link>
      </nav>
      <button
        type="button"
        onClick={onSignOut}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors"
      >
        Salir
      </button>
    </header>
  );
}

function Notebook({
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
  // TanStack Query deduplica por queryKey, así que esta llamada reutiliza
  // el cache que carga <Balances/> debajo. Sin fetch doble.
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
                Abierta el {formatCreatedAt(group.createdAt)}
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
                {formatInviteCode(group.inviteCode)}
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
        {/* Índice de apartados: vive encima del contenido de cada tab.
            Mismo idioma que el cuaderno: mono, uppercase, sin colores
            nuevos. El activo se marca con una línea inferior en
            `--color-ink` (no con fondo, como el chrome por defecto
            de shadcn). El contador `· 03` se calcula en cada
            componente y se notifica al padre vía `onCountChange`. */}
        <TabsList
          variant="line"
          className="bg-transparent border-b border-ink/15 rounded-none p-0 h-auto justify-start gap-1 text-ink/55"
        >
          <TabTrigger
            value="signers"
            label="Firmantes"
            count={counts.signers}
          />
          <TabTrigger
            value="expenses"
            label="Apuntes"
            count={counts.expenses}
          />
          <TabTrigger
            value="balances"
            label="Saldos"
            count={counts.balances}
          />
        </TabsList>

        <TabsContent
          value="signers"
          className="mt-0 focus-visible:outline-none"
        >
          <Signers
            group={group}
            currentUserId={currentUserId}
            members={members}
            membersLoading={membersQuery.isLoading}
            membersError={membersQuery.error ? (membersQuery.error as Error).message : null}
            onCountChange={(n) => onCountChange("signers", n)}
          />
        </TabsContent>

        <TabsContent
          value="expenses"
          className="mt-0 focus-visible:outline-none"
        >
          <Expenses
            groupId={group.id}
            currentUserId={currentUserId}
            members={members}
            membersLoading={membersQuery.isLoading}
            membersError={membersQuery.error ? (membersQuery.error as Error).message : null}
            formOpen={expenseFormOpen}
            onOpenForm={onOpenExpenseForm}
            onCloseForm={onCloseExpenseForm}
            onCountChange={(n) => onCountChange("expenses", n)}
          />
        </TabsContent>

        <TabsContent
          value="balances"
          className="mt-0 focus-visible:outline-none"
        >
          <Balances
            groupId={group.id}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            members={members ?? []}
            onCountChange={(n) => onCountChange("balances", n)}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

/**
 * Trigger de pestaña con el chrome del cuaderno: mono, uppercase,
 * sin fondo, sin bordes redondeados, con un contador a la derecha
 * separado por `·`. El subrayado del activo viene del `variant="line"`
 * del `TabsList` (regla `after:opacity-100` cuando el trigger está
 * activo) — aquí solo aportamos color y peso.
 */
function TabTrigger({
  value,
  label,
  count,
}: {
  value: "signers" | "expenses" | "balances";
  label: string;
  count: number | null;
}) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none bg-transparent font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink data-active:text-ink data-active:font-medium px-3 py-2.5 h-auto data-active:bg-transparent data-active:shadow-none"
    >
      {label}
      <span aria-hidden className="text-ink/30"> · </span>
      <span className="tabular-nums">
        {count === null ? "—" : count.toString().padStart(2, "0")}
      </span>
    </TabsTrigger>
  );
}

function Signers({
  group,
  currentUserId,
  members,
  membersLoading,
  membersError,
  onCountChange,
}: {
  group: GroupDetail;
  currentUserId: string;
  members: GroupMember[] | null;
  membersLoading: boolean;
  membersError: string | null;
  onCountChange?: (n: number | null) => void;
}) {
  // El padre (Notebook) necesita saber el número de firmantes para
  // mostrar el contador en la tab. Le pasamos el número, o `null`
  // si todavía no tenemos datos. Es un efecto, no un side-effect
  // durante el render, para no provocar re-renders en cascada.
  useEffect(() => {
    onCountChange?.(members ? members.length : null);
  }, [members, onCountChange]);
  return (
    <section aria-label="Firmantes de la cuenta" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
          Firmantes
        </p>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40">
          {members
            ? `${members.length} ${members.length === 1 ? "persona" : "personas"}`
            : "—"}
        </p>
      </div>

      <article className="receipt relative">
        <div className="bg-card border-x border-ink/12">
          {membersError ? (
            <div className="px-7 py-6 sm:px-9">
              <p className="text-sm text-ink/65">
                {membersError}{" "}
                <span className="text-ink/40">— puedes seguir mirando la cuenta.</span>
              </p>
            </div>
          ) : membersLoading || members === null ? (
            <SignersSkeleton count={2} />
          ) : members.length === 0 ? (
            <div className="px-7 py-6 sm:px-9">
              <p className="text-sm text-ink/55">Nadie ha firmado todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {members.map((m) => (
                <SignerRow
                  key={m.userId}
                  name={m.name}
                  joinedAt={m.joinedAt}
                  isCurrent={m.userId === currentUserId}
                  isOwner={m.userId === group.createdBy}
                />
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>Cada firma entra en el cuaderno.</span>
            <span className="font-mono tracking-wider">#firmas</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function SignerRow({
  name,
  joinedAt,
  isCurrent,
  isOwner,
}: {
  name: string;
  joinedAt: string;
  isCurrent: boolean;
  isOwner: boolean;
}) {
  return (
    <li className="px-7 py-4 sm:px-9 flex items-center gap-4">
      <span
        aria-hidden
        className="font-mono text-ink/30 text-lg leading-none -mt-0.5 select-none"
      >
        ·
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold tracking-[-0.01em] text-ink truncate">
          {name}
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
          desde el {formatCreatedAt(joinedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isCurrent && !isOwner && <YouChip />}
        {isOwner && <OwnerStamp isYou={isCurrent} />}
      </div>
    </li>
  );
}

function YouChip() {
  return (
    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/65 border-b border-ink/30 pb-0.5">
      Tú
    </span>
  );
}

function OwnerStamp({ isYou }: { isYou: boolean }) {
  return (
    <span aria-hidden className="stamp relative select-none">
      <span className="inline-block border-[1.5px] border-accent rounded-[3px] px-2.5 py-1 rotate-[-6deg]">
        <span className="block font-mono text-[10px] tracking-[0.26em] uppercase text-accent leading-none">
          {isYou ? "Tú · abriste" : "Abierto por"}
        </span>
      </span>
    </span>
  );
}

function SignersSkeleton({ count }: { count: number }) {
  return (
    <ul className="divide-y divide-ink/10">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="px-7 py-4 sm:px-9 flex items-center gap-4"
          aria-hidden
        >
          <span className="size-2 rounded-full bg-ink/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-ink/10" />
            <div className="h-2.5 w-24 bg-ink/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Expenses({
  groupId,
  currentUserId,
  members,
  membersLoading,
  membersError,
  formOpen,
  onOpenForm,
  onCloseForm,
  onCountChange,
}: {
  groupId: string;
  currentUserId: string;
  members: GroupMember[] | null;
  membersLoading: boolean;
  membersError: string | null;
  formOpen: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onCountChange?: (n: number | null) => void;
}) {
  const canOpenForm = !!members && members.length > 0 && !membersError;
  const expensesQuery = useGroupExpenses(groupId);
  const expenses = expensesQuery.data ?? null;
  const count = expenses?.length ?? 0;
  const countLabel = `${count.toString().padStart(2, "0")}`;
  useEffect(() => {
    onCountChange?.(expenses ? expenses.length : null);
  }, [expenses, onCountChange]);
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseWithSplits | null>(null);

  return (
    <section aria-label="Gastos de la cuenta" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
          Apuntes
        </p>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40">
          {expensesQuery.isLoading ? "…" : countLabel}
        </p>
      </div>

      <article className="receipt relative">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              {expensesQuery.isLoading
                ? "Cargando…"
                : count === 0
                  ? "Aún sin apuntes"
                  : "Últimos apuntes"}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              —
            </span>
          </div>

          {expensesQuery.isError ? (
            <div className="px-7 py-6 sm:px-9">
              <p className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1">
                {(expensesQuery.error as Error).message}
              </p>
            </div>
          ) : expenses && expenses.length > 0 ? (
            <ul className="divide-y divide-ink/10">
              {expenses.map((e, i) => (
                <ExpenseRow
                  key={e.id}
                  index={i}
                  expense={e}
                  paidByName={
                    members?.find((m) => m.userId === e.paidBy)?.name ?? "—"
                  }
                  canCancel={e.paidBy === currentUserId}
                  onOpen={() => setSelectedExpense(e)}
                />
              ))}
            </ul>
          ) : !expensesQuery.isLoading ? (
            <div className="px-7 py-7 sm:px-9 space-y-5">
              <p className="text-sm text-ink/65 max-w-xs">
                Anota el primer gasto de la cuenta. La lista se irá
                rellenando conforme se sumen más.
              </p>
            </div>
          ) : (
            <ul aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-7 py-4 sm:px-9 border-b border-ink/10 last:border-b-0">
                  <div className="h-3.5 w-1/2 bg-ink/10" />
                  <div className="mt-2 h-2.5 w-1/3 bg-ink/5" />
                </li>
              ))}
            </ul>
          )}

          {membersError ? (
            <div className="px-7 pt-2 pb-7 sm:px-9">
              <p className="font-mono text-[11px] text-accent border-l-2 border-accent pl-3 py-1">
                {membersError}
              </p>
            </div>
          ) : membersLoading ? (
            <div className="px-7 pt-2 pb-7 sm:px-9">
              <div className="h-9 w-48 bg-ink/5" aria-hidden />
            </div>
          ) : (
            <div className="px-7 pt-2 pb-7 sm:px-9">
              <button
                type="button"
                onClick={onOpenForm}
                disabled={!canOpenForm}
                className="group/btn relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
                />
                <span className="relative inline-flex items-center gap-1.5 px-5 py-2.5 text-card font-semibold tracking-wide">
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  {count === 0 ? "Anotar gasto" : "Anotar otro"}
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>
              {count === 0
                ? "El primer apunte es el más difícil."
                : "Cada apunte, una línea del cuaderno."}
            </span>
            <span className="font-mono tracking-wider">#gastos</span>
          </div>
        </div>
      </article>

      <Dialog
        open={formOpen && !!members}
        onOpenChange={(open) => {
          if (!open) onCloseForm();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="bg-paper border border-ink/15 ring-0 shadow-none p-0 rounded-sm max-w-md gap-0 max-h-[calc(100dvh-2rem)] overflow-hidden"
        >
          {members && (
            <ExpenseForm
              groupId={groupId}
              members={members}
              defaultPayerId={currentUserId || members[0]?.userId || ""}
              onClose={onCloseForm}
            />
          )}
        </DialogContent>
      </Dialog>

      <ExpenseDetailsSheet
        expense={selectedExpense}
        members={members ?? []}
        payerName={
          (selectedExpense &&
            members?.find((m) => m.userId === selectedExpense.paidBy)?.name) ??
          "—"
        }
        open={!!selectedExpense}
        onOpenChange={(open) => {
          if (!open) setSelectedExpense(null);
        }}
      />
    </section>
  );
}

function ExpenseRow({
  index,
  expense,
  paidByName,
  canCancel,
  onOpen,
}: {
  index: number;
  expense: ExpenseWithSplits;
  paidByName: string;
  canCancel: boolean;
  onOpen: () => void;
}) {
  const cancel = useCancelExpense(useGroupIdFromContext());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    setError(null);
    try {
      await cancel.mutateAsync(expense.id);
      setConfirmOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No hemos podido anularlo.");
      }
    }
  };

  return (
    <li className="group/row relative">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onOpen}
              className="w-full text-left flex items-center gap-4 px-7 py-4 sm:px-9 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors"
            />
          }
        >
          <span className="font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0">
            ,{(index + 1).toString().padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1 block">
            <span className="block truncate text-base font-semibold tracking-[-0.01em] text-ink">
              {expense.description}
            </span>
            <span className="block font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
              Pagó {paidByName}
              <span className="text-ink/30" aria-hidden>
                {" · "}
              </span>
              <time dateTime={expense.createdAt} title={formatCreatedAt(expense.createdAt)}>
                {formatShortDate(expense.createdAt)}
              </time>
            </span>
          </span>
          <span className="font-mono text-sm tabular-nums text-ink/85">
            {formatCents(expense.amountCents, expense.currency)}
          </span>
          {!canCancel && (
            <span
              aria-hidden
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/30"
            >
              —
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Ver detalle del apunte
        </TooltipContent>
      </Tooltip>

      {/* El menú vive fuera del <button> (HTML válido) y se posiciona
          sobre la esquina derecha de la fila. Como el contenido del menú
          viaja al body vía Portal, abrirlo no propaga al botón. */}
      {canCancel && (
        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
          <RowMenu
            onRequestCancel={() => {
              setError(null);
              setConfirmOpen(true);
            }}
          />
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-paper border border-ink/15 ring-0 shadow-none rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-xs tracking-[0.22em] uppercase text-ink/55">
              Anular gasto
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-ink/85">
              ¿Anular «{expense.description}»? El apunte deja de contar en los
              saldos. Si te equivocaste, anota después el gasto correcto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p
              role="alert"
              className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
            >
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={cancel.isPending}
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              No, volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={cancel.isPending}
              variant="destructive"
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              {cancel.isPending ? "Anulando…" : "Sí, anular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function RowMenu({ onRequestCancel }: { onRequestCancel: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Acciones del apunte"
        className="text-ink/35 hover:text-ink transition-colors p-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40"
      >
        <MoreHorizontal className="size-4" strokeWidth={2} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="bg-paper border border-ink/15 shadow-md ring-1 ring-foreground/10 rounded-sm min-w-40"
      >
        <DropdownMenuItem
          variant="destructive"
          onClick={onRequestCancel}
          className="font-mono text-[10px] tracking-[0.18em] uppercase"
        >
          <Ban className="size-3.5" strokeWidth={2} aria-hidden />
          Anular gasto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook auxiliar: lee el `groupId` desde la URL. Lo necesita ExpenseRow
// para construir `useCancelExpense(groupId)`, pero el componente está
// fuera del árbol de Notebook. Lo hacemos con useParams aquí para no
// pasar `groupId` por props a cada fila.
function useGroupIdFromContext(): string {
  const { id } = useParams<{ id: string }>();
  return id ?? "";
}

function Balances({
  groupId,
  currentUserId,
  currentUserName,
  members,
  onCountChange,
}: {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  members: GroupMember[];
  onCountChange?: (n: number | null) => void;
}) {
  const balancesQuery = useGroupBalances(groupId);
  const balances = balancesQuery.data ?? null;
  const isLoading = balancesQuery.isLoading;
  const error = balancesQuery.error
    ? balancesQuery.error instanceof ApiError
      ? balancesQuery.error.message
      : "No hemos podido calcular los saldos."
    : null;

  const myEntry = balances?.balances.find((b) => b.userId === currentUserId);
  const myBalanceCents = myEntry?.amountCents ?? balances?.myBalanceCents ?? 0;
  // El contador en la tab es el número de transfers pendientes de
  // liquidar. Es lo que indica acción: si es 0, el cuaderno está al
  // día. Los settlements ya liquidados viven en otra sección y no
  // son acción, son histórico.
  useEffect(() => {
    onCountChange?.(balances ? balances.transfers.length : null);
  }, [balances, onCountChange]);

  return (
    <section aria-label="Saldos y liquidaciones" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
          Saldos
        </p>
        {balances && (
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40">
            {balances.balances.length}{" "}
            {balances.balances.length === 1 ? "persona" : "personas"}
          </p>
        )}
      </div>

      <article className="receipt">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              Resumen
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              —
            </span>
          </div>

          <div className="px-7 pt-7 pb-2 sm:px-9">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
              Tu saldo
            </p>
            <p className="mt-3 text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-ink">
              <MyBalanceLine
                cents={myBalanceCents}
                name={currentUserName}
                isLoading={isLoading}
                error={error}
              />
            </p>
          </div>

          <div className="px-7 pt-6 pb-2 sm:px-9 border-t border-dashed border-ink/15">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
              Por liquidar
            </p>
            {error ? (
              <p className="mt-3 text-sm text-ink/55">
                {error}{" "}
                <span className="text-ink/40">— el cuaderno sigue abierto.</span>
              </p>
            ) : isLoading || !balances ? (
              <BalancesSkeleton />
            ) : balances.transfers.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">
                No hay deudas pendientes. La cuenta está saldada.
              </p>
            ) : (
              <ul className="mt-3">
                {balances.transfers.map((t, i) => (
                  <TransferRow
                    key={`${t.fromUserId}-${t.toUserId}-${i}`}
                    transfer={t}
                    currentUserId={currentUserId}
                    groupId={groupId}
                    index={i}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>Mínimo de transferencias para cuadrar.</span>
            <span className="font-mono tracking-wider">#saldos</span>
          </div>
        </div>
      </article>

      <LiquidatedCard
        groupId={groupId}
        currentUserId={currentUserId}
        members={members}
      />
    </section>
  );
}

function MyBalanceLine({
  cents,
  name,
  isLoading,
  error,
}: {
  cents: number;
  name: string;
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return <span className="text-ink/30">…</span>;
  }
  if (error) {
    return <span className="text-ink/40">No calculable ahora</span>;
  }
  if (cents > 0) {
    return (
      <>
        <span className="text-ink/55">Te deben </span>
        <span className="text-ink">{formatCents(cents)}</span>
        <span className="text-ink/40 text-base ml-1">, {name.split(" ")[0]}.</span>
      </>
    );
  }
  if (cents < 0) {
    return (
      <>
        <span className="text-ink/55">Debes </span>
        <span className="text-ink">{formatCents(-cents)}</span>
        <span className="text-ink/40 text-base ml-1">a alguien.</span>
      </>
    );
  }
  return (
    <>
      <span className="text-ink/55">No debes nada. </span>
      <span className="text-ink/40 text-base">Cuenta saldada.</span>
    </>
  );
}

function TransferRow({
  transfer,
  currentUserId,
  groupId,
  index,
}: {
  transfer: import("@/types/group").Transfer;
  currentUserId: string;
  groupId: string;
  index: number;
}) {
  const settle = useCreateSettlement(groupId);
  const [leaving, setLeaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const isMine = transfer.fromUserId === currentUserId;
  const isOwedToMe = transfer.toUserId === currentUserId;

  const onSettle = async () => {
    setRowError(null);
    setLeaving(true);
    try {
      await settle.mutateAsync({
        toUser: transfer.toUserId,
        amountCents: transfer.amountCents,
      });
    } catch (err) {
      // Si falla la mutación, devolvemos la fila a su estado normal.
      if (err instanceof ApiError) {
        setRowError(err.message);
      } else {
        setRowError("No hemos podido liquidar.");
      }
      setLeaving(false);
    }
  };

  return (
    <li
      data-leaving={leaving ? "true" : "false"}
      className="transfer-row"
    >
      <div className="py-3 flex items-center gap-2 text-sm">
        <span aria-hidden className="text-ink/30 select-none pl-1">
          ·
        </span>
        <span className="min-w-0 flex-1 text-ink/80">
          <span className="font-semibold text-ink">{transfer.fromName}</span>
          <span className="text-ink/55"> le debe </span>
          <span className="font-semibold text-ink tabular-nums">
            {formatCents(transfer.amountCents)}
          </span>
          <span className="text-ink/55"> a </span>
          <span className="font-semibold text-ink">{transfer.toName}</span>
        </span>
        {isMine && (
          <button
            type="button"
            onClick={onSettle}
            disabled={settle.isPending}
            className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent hover:text-ink underline underline-offset-4 decoration-1 hover:decoration-2 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-wait"
          >
            {settle.isPending ? "Anotando…" : "Saldar"}
          </button>
        )}
        {!isMine && isOwedToMe && (
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45 shrink-0">
            Te deben
          </span>
        )}
      </div>
      {rowError && (
        <div className="pb-2 pl-1">
          <p
            role="alert"
            className="font-mono text-[11px] text-accent border-l-2 border-accent pl-3 py-1"
          >
            {rowError}
          </p>
        </div>
      )}
    </li>
  );
}

function LiquidatedCard({
  groupId,
  currentUserId,
  members,
}: {
  groupId: string;
  currentUserId: string;
  members: GroupMember[];
}) {
  const settlementsQuery = useGroupSettlements(groupId);
  const cancelSettlement = useDeleteSettlement(groupId);
  const [pendingCancel, setPendingCancel] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const settlements = settlementsQuery.data ?? [];
  const memberById = new Map(members.map((m) => [m.userId, m.name]));

  const onConfirmCancel = async () => {
    if (!pendingCancel) return;
    setCancelError(null);
    try {
      await cancelSettlement.mutateAsync(pendingCancel.id);
      setPendingCancel(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setCancelError(err.message);
      } else {
        setCancelError("No hemos podido deshacer el pago.");
      }
    }
  };

  return (
    <article className="receipt">
      <div className="bg-card border-x border-ink/12">
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Liquidaciones
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45">
            {settlementsQuery.isLoading
              ? "…"
              : settlements.length === 0
                ? "—"
                : settlements.length.toString().padStart(2, "0")}
          </span>
        </div>

        {settlementsQuery.isLoading ? (
          <ul aria-hidden className="divide-y divide-ink/10">
            {[0].map((i) => (
              <li
                key={i}
                className="px-1 py-3 flex items-center gap-3"
              >
                <span className="size-2 rounded-full bg-ink/10 ml-1" />
                <div className="flex-1 h-3.5 bg-ink/10" />
                <div className="w-14 h-3.5 bg-ink/10" />
              </li>
            ))}
          </ul>
        ) : settlements.length === 0 ? (
          <div className="px-7 py-6 sm:px-9">
            <p className="text-sm text-ink/55">
              Cuando se liquide el primer movimiento, quedará sellado aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {settlements.map((s, i) => {
              const isMine = s.fromUser === currentUserId;
              const fromName = memberById.get(s.fromUser) ?? "—";
              const toName = memberById.get(s.toUser) ?? "—";
              return (
                <li
                  key={s.id}
                  className="px-1 py-3 flex items-center gap-2 text-sm animate-print"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span aria-hidden className="text-ink/35 select-none pl-1">
                    ·
                  </span>
                  <span className="min-w-0 flex-1 text-ink/80">
                    <span
                      className={
                        s.fromUser === currentUserId
                          ? "font-semibold text-ink"
                          : ""
                      }
                    >
                      {fromName}
                    </span>
                    <span className="text-ink/55"> saldó </span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatCents(s.amountCents)}
                    </span>
                    <span className="text-ink/55"> con </span>
                    <span
                      className={
                        s.toUser === currentUserId
                          ? "font-semibold text-ink"
                          : ""
                      }
                    >
                      {toName}
                    </span>
                  </span>
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelError(null);
                        setPendingCancel({
                          id: s.id,
                          name: `${fromName} → ${toName} · ${formatCents(s.amountCents)}`,
                        });
                      }}
                      className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-accent underline underline-offset-4 decoration-1 hover:decoration-2 transition-colors shrink-0 pr-1"
                    >
                      Deshacer
                    </button>
                  ) : (
                    <span
                      aria-hidden
                      className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45 shrink-0 pr-1"
                    >
                      Listo
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
          <span>Cuaderno saldado.</span>
          <span className="font-mono tracking-wider">#liquidadas</span>
        </div>
      </div>

      <AlertDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCancel(null);
            setCancelError(null);
          }
        }}
      >
        <AlertDialogContent className="bg-paper border border-ink/15 ring-0 shadow-none rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-xs tracking-[0.22em] uppercase text-ink/55">
              Deshacer pago
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-ink/85">
              {pendingCancel && (
                <>
                  ¿Deshacemos el pago{" "}
                  <span className="font-semibold text-ink">
                    {pendingCancel.name}
                  </span>
                  ? Los saldos vuelven al estado anterior.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && (
            <p
              role="alert"
              className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
            >
              {cancelError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={cancelSettlement.isPending}
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmCancel}
              disabled={cancelSettlement.isPending}
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              {cancelSettlement.isPending ? "Deshaciendo…" : "Sí, deshacer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function BalancesSkeleton() {
  return (
    <ul className="mt-3 divide-y divide-ink/10" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="py-3 flex items-center gap-3">
          <span className="size-2 rounded-full bg-ink/10" />
          <div className="flex-1 h-3.5 bg-ink/10" />
          <div className="w-12 h-3.5 bg-ink/10" />
        </li>
      ))}
    </ul>
  );
}

function InviteStamp({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copiar código de invitación"
      className="stamp relative -mt-1 shrink-0 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm"
    >
      <div className="border-[1.5px] border-accent rounded-[3px] px-3 py-1.5 rotate-[-6deg]">
        <span className="block font-mono text-[11px] tracking-[0.28em] uppercase text-accent leading-none">
          {copied ? "¡Listo!" : "Invita"}
        </span>
      </div>
    </button>
  );
}

/**
 * Sello "Liquidado" que aparece en la cabecera del grupo cuando
 * `balances.isSettled === true`. Es informativo (no accionable),
 * por eso es un <span>, no un botón. Color ink/70 (no accent) para
 * diferenciar de los sellos de eventos: "liquidado" es un estado
 * estable, no una acción.
 */
function SettledStamp() {
  return (
    <span
      aria-label="Cuenta liquidada"
      className="stamp relative inline-block mt-3 select-none"
    >
      <span className="inline-block border-[1.5px] border-ink/40 rounded-[3px] px-2.5 py-1 rotate-[3deg]">
        <span className="block font-mono text-[10px] tracking-[0.26em] uppercase text-ink/70 leading-none">
          Liquidado
        </span>
      </span>
    </span>
  );
}

function Skeleton() {
  return (
    <div className="mt-10 sm:mt-12 receipt">
      <div className="bg-card border-x border-ink/12 px-7 py-7 sm:px-9 space-y-5">
        <div className="h-3 w-20 bg-ink/10" />
        <div className="h-9 w-3/4 bg-ink/10" />
        <div className="h-3 w-1/2 bg-ink/10" />
        <div className="h-14 w-full bg-ink/5 mt-6" />
        <div className="h-3 w-2/3 bg-ink/5" />
      </div>
    </div>
  );
}

function ErrorState({
  kind,
  message,
  onBack,
  onRetry,
}: {
  kind: "load" | "notfound" | "forbidden";
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const title =
    kind === "notfound"
      ? "No existe esa cuenta."
      : kind === "forbidden"
        ? "No tienes acceso."
        : "No hemos podido abrirla.";

  return (
    <main className="mt-10 sm:mt-12">
      <div className="receipt">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              Error
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              !
            </span>
          </div>
          <div className="px-7 py-8 sm:px-9 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
              {title}
            </h1>
            <p className="text-sm text-ink/65">{message}</p>
            <div className="flex items-center gap-5 pt-1">
              <button
                type="button"
                onClick={onBack}
                className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
              >
                Volver a tus cuentas
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
