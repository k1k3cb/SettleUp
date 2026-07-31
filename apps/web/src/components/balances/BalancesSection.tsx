import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { GroupMember } from "@/services/members";
import type { Transfer } from "@/types/group";
import { useGroupBalances } from "@/hooks/useGroupBalances";
import {
  useCreateSettlement,
  useDeleteSettlement,
  useGroupSettlements,
} from "@/hooks/useSettlements";
import { formatCents, formatDateTime } from "@/lib/formatters";
import { ApiError } from "@/lib/api";
import { BalancesSkeleton } from "@/components/group/GroupSkeleton";
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

export function BalancesSection({
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
  // liquidar. Callback en un ref, useEffect solo depende del valor.
  const onCountChangeRef = useRef<(n: number | null) => void>(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  });
  useEffect(() => {
    onCountChangeRef.current?.(balances ? balances.transfers.length : null);
  }, [balances]);

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
  transfer: Transfer;
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
