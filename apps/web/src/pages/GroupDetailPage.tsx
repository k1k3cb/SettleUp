import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Plus, Wallet } from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { groupsService, type GroupDetail } from "@/services/groups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import type { GroupMember } from "@/services/members";
import { ApiError } from "@/lib/api";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const formatCents = (cents: number, currency: string): string => {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = (abs % 100).toString().padStart(2, "0");
  const symbol = currency === "EUR" ? "€" : currency;
  return `${sign}${major},${minor} ${symbol}`;
};

const formatInviteCode = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
};

const formatCreatedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

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
          onBack={() => navigate("/groups")}
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
            copied={copied}
            onCopy={onCopy}
            expenseFormOpen={expenseFormOpen}
            onOpenExpenseForm={() => setExpenseFormOpen(true)}
            onCloseExpenseForm={() => setExpenseFormOpen(false)}
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </div>
  );
}

function Header({
  onBack,
  onSignOut,
}: {
  onBack: () => void;
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
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
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
  copied,
  onCopy,
  expenseFormOpen,
  onOpenExpenseForm,
  onCloseExpenseForm,
}: {
  group: GroupDetail;
  currentUserId: string;
  copied: boolean;
  onCopy: () => void;
  expenseFormOpen: boolean;
  onOpenExpenseForm: () => void;
  onCloseExpenseForm: () => void;
}) {
  const isOwner = group.createdBy === currentUserId;
  const membersQuery = useGroupMembers(group.id);
  const members = membersQuery.data ?? null;

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

      <Signers
        group={group}
        currentUserId={currentUserId}
        members={members}
        membersLoading={membersQuery.isLoading}
        membersError={membersQuery.error ? (membersQuery.error as Error).message : null}
      />

      <Expenses
        groupId={group.id}
        currentUserId={currentUserId}
        members={members}
        membersLoading={membersQuery.isLoading}
        membersError={membersQuery.error ? (membersQuery.error as Error).message : null}
        formOpen={expenseFormOpen}
        onOpenForm={onOpenExpenseForm}
        onCloseForm={onCloseExpenseForm}
      />

      <BalancesPending />
    </main>
  );
}

function Signers({
  group,
  currentUserId,
  members,
  membersLoading,
  membersError,
}: {
  group: GroupDetail;
  currentUserId: string;
  members: GroupMember[] | null;
  membersLoading: boolean;
  membersError: string | null;
}) {
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
}: {
  groupId: string;
  currentUserId: string;
  members: GroupMember[] | null;
  membersLoading: boolean;
  membersError: string | null;
  formOpen: boolean;
  onOpenForm: () => void;
  onCloseForm: () => void;
}) {
  const canOpenForm = !!members && members.length > 0 && !membersError;
  const expensesQuery = useGroupExpenses(groupId);
  const expenses = expensesQuery.data ?? null;
  const count = expenses?.length ?? 0;
  const countLabel = `${count.toString().padStart(2, "0")}`;

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
                  description={e.description}
                  amountCents={e.amountCents}
                  currency={e.currency}
                  paidByName={
                    members?.find((m) => m.userId === e.paidBy)?.name ?? "—"
                  }
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
    </section>
  );
}

function ExpenseRow({
  index,
  description,
  amountCents,
  currency,
  paidByName,
}: {
  index: number;
  description: string;
  amountCents: number;
  currency: string;
  paidByName: string;
}) {
  return (
    <li className="px-7 py-4 sm:px-9 flex items-center gap-4">
      <span className="font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0">
        ,{(index + 1).toString().padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-[-0.01em] text-ink">
          {description}
        </p>
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
          Pagó {paidByName}
        </p>
      </div>
      <span className="font-mono text-sm tabular-nums text-ink/85">
        {formatCents(amountCents, currency)}
      </span>
    </li>
  );
}

function BalancesPending() {
  return (
    <section aria-label="Saldos" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
          Saldos
        </p>
      </div>
      <article className="receipt">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              Pendiente
            </span>
            <Wallet
              className="size-3.5 text-ink/40"
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <div className="px-7 py-6 sm:px-9">
            <p className="text-sm text-ink/55">
              Los saldos se calculan cuando haya gastos apuntados.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>Llegará con los apuntes.</span>
            <span className="font-mono tracking-wider">#saldos</span>
          </div>
        </div>
      </article>
    </section>
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
