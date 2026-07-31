import { useEffect, useRef, useState } from "react";
import { Ban, MoreHorizontal, Plus } from "lucide-react";
import type { GroupMember } from "@/services/members";
import type { ExpenseWithSplits } from "@/services/expenses";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { useCancelExpense } from "@/hooks/useCancelExpense";
import { useGroupId } from "@/hooks/useGroupId";
import { formatCents, formatShortDate } from "@/lib/formatters";
import { ApiError } from "@/lib/api";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseDetailsSheet } from "@/components/expenses/ExpenseDetailsSheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

export function ExpensesSection({
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
  const countLabel = count.toString().padStart(2, "0");
  // Callback en un ref, useEffect solo depende del valor. Evita el
  // bucle infinito si el padre pasa el callback inline.
  const onCountChangeRef = useRef<(n: number | null) => void>(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  });
  useEffect(() => {
    onCountChangeRef.current?.(expenses ? expenses.length : null);
  }, [expenses]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithSplits | null>(null);

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
                <li
                  key={i}
                  className="px-7 py-4 sm:px-9 border-b border-ink/10 last:border-b-0"
                >
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

      {formOpen && members && (
        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            if (!open) onCloseForm();
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="bg-paper border border-ink/15 ring-0 shadow-none p-0 rounded-sm max-w-md gap-0 max-h-[calc(100dvh-2rem)] overflow-hidden"
          >
            <ExpenseForm
              groupId={groupId}
              members={members}
              defaultPayerId={currentUserId || members[0]?.userId || ""}
              onClose={onCloseForm}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedExpense && (
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
      )}
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
  const groupId = useGroupId();
  const cancel = useCancelExpense(groupId);
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
              <time
                dateTime={expense.createdAt}
                title={formatShortDate(expense.createdAt)}
              >
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
