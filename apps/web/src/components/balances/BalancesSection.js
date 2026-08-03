import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useGroupBalances } from "@/hooks/useGroupBalances";
import { useCreateSettlement, useDeleteSettlement, useGroupSettlements, } from "@/hooks/useSettlements";
import { formatCents } from "@/lib/formatters";
import { ApiError } from "@/lib/api";
import { BalancesSkeleton } from "@/components/group/GroupSkeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
export function BalancesSection({ groupId, currentUserId, currentUserName, members, onCountChange, }) {
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
    const onCountChangeRef = useRef(onCountChange);
    useEffect(() => {
        onCountChangeRef.current = onCountChange;
    });
    useEffect(() => {
        onCountChangeRef.current?.(balances ? balances.transfers.length : null);
    }, [balances]);
    return (_jsxs("section", { "aria-label": "Saldos y liquidaciones", className: "space-y-3", children: [_jsxs("div", { className: "flex items-baseline justify-between px-1", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Saldos" }), balances && (_jsxs("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40", children: [balances.balances.length, " ", balances.balances.length === 1 ? "persona" : "personas"] }))] }), _jsx("article", { className: "receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Resumen" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2014" })] }), _jsxs("div", { className: "px-7 pt-7 pb-2 sm:px-9", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Tu saldo" }), _jsx("p", { className: "mt-3 text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-ink", children: _jsx(MyBalanceLine, { cents: myBalanceCents, name: currentUserName, isLoading: isLoading, error: error }) })] }), _jsxs("div", { className: "px-7 pt-6 pb-2 sm:px-9 border-t border-dashed border-ink/15", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Por liquidar" }), error ? (_jsxs("p", { className: "mt-3 text-sm text-ink/55", children: [error, " ", _jsx("span", { className: "text-ink/40", children: "\u2014 el cuaderno sigue abierto." })] })) : isLoading || !balances ? (_jsx(BalancesSkeleton, {})) : balances.transfers.length === 0 ? (_jsx("p", { className: "mt-3 text-sm text-ink/55", children: "No hay deudas pendientes. La cuenta est\u00E1 saldada." })) : (_jsx("ul", { className: "mt-3", children: balances.transfers.map((t, i) => (_jsx(TransferRow, { transfer: t, currentUserId: currentUserId, groupId: groupId, index: i }, `${t.fromUserId}-${t.toUserId}-${i}`))) }))] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "M\u00EDnimo de transferencias para cuadrar." }), _jsx("span", { className: "font-mono tracking-wider", children: "#saldos" })] })] }) }), _jsx(LiquidatedCard, { groupId: groupId, currentUserId: currentUserId, members: members })] }));
}
function MyBalanceLine({ cents, name, isLoading, error, }) {
    if (isLoading) {
        return _jsx("span", { className: "text-ink/30", children: "\u2026" });
    }
    if (error) {
        return _jsx("span", { className: "text-ink/40", children: "No calculable ahora" });
    }
    if (cents > 0) {
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-ink/55", children: "Te deben " }), _jsx("span", { className: "text-ink", children: formatCents(cents) }), _jsxs("span", { className: "text-ink/40 text-base ml-1", children: [", ", name.split(" ")[0], "."] })] }));
    }
    if (cents < 0) {
        return (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-ink/55", children: "Debes " }), _jsx("span", { className: "text-ink", children: formatCents(-cents) }), _jsx("span", { className: "text-ink/40 text-base ml-1", children: "a alguien." })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-ink/55", children: "No debes nada. " }), _jsx("span", { className: "text-ink/40 text-base", children: "Cuenta saldada." })] }));
}
function TransferRow({ transfer, currentUserId, groupId, index, }) {
    const settle = useCreateSettlement(groupId);
    const [leaving, setLeaving] = useState(false);
    const [rowError, setRowError] = useState(null);
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
        }
        catch (err) {
            if (err instanceof ApiError) {
                setRowError(err.message);
            }
            else {
                setRowError("No hemos podido liquidar.");
            }
            setLeaving(false);
        }
    };
    return (_jsxs("li", { "data-leaving": leaving ? "true" : "false", className: "transfer-row", children: [_jsxs("div", { className: "py-3 flex items-center gap-2 text-sm", children: [_jsx("span", { "aria-hidden": true, className: "text-ink/30 select-none pl-1", children: "\u00B7" }), _jsxs("span", { className: "min-w-0 flex-1 text-ink/80", children: [_jsx("span", { className: "font-semibold text-ink", children: transfer.fromName }), _jsx("span", { className: "text-ink/55", children: " le debe " }), _jsx("span", { className: "font-semibold text-ink tabular-nums", children: formatCents(transfer.amountCents) }), _jsx("span", { className: "text-ink/55", children: " a " }), _jsx("span", { className: "font-semibold text-ink", children: transfer.toName })] }), isMine && (_jsx("button", { type: "button", onClick: onSettle, disabled: settle.isPending, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-accent hover:text-ink underline underline-offset-4 decoration-1 hover:decoration-2 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-wait", children: settle.isPending ? "Anotando…" : "Saldar" })), !isMine && isOwedToMe && (_jsx("span", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45 shrink-0", children: "Te deben" }))] }), rowError && (_jsx("div", { className: "pb-2 pl-1", children: _jsx("p", { role: "alert", className: "font-mono text-[11px] text-accent border-l-2 border-accent pl-3 py-1", children: rowError }) }))] }));
}
function LiquidatedCard({ groupId, currentUserId, members, }) {
    const settlementsQuery = useGroupSettlements(groupId);
    const cancelSettlement = useDeleteSettlement(groupId);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [cancelError, setCancelError] = useState(null);
    const settlements = settlementsQuery.data ?? [];
    const memberById = new Map(members.map((m) => [m.userId, m.name]));
    const onConfirmCancel = async () => {
        if (!pendingCancel)
            return;
        setCancelError(null);
        try {
            await cancelSettlement.mutateAsync(pendingCancel.id);
            setPendingCancel(null);
        }
        catch (err) {
            if (err instanceof ApiError) {
                setCancelError(err.message);
            }
            else {
                setCancelError("No hemos podido deshacer el pago.");
            }
        }
    };
    return (_jsxs("article", { className: "receipt", children: [_jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Liquidaciones" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45", children: settlementsQuery.isLoading
                                    ? "…"
                                    : settlements.length === 0
                                        ? "—"
                                        : settlements.length.toString().padStart(2, "0") })] }), settlementsQuery.isLoading ? (_jsx("ul", { "aria-hidden": true, className: "divide-y divide-ink/10", children: [0].map((i) => (_jsxs("li", { className: "px-1 py-3 flex items-center gap-3", children: [_jsx("span", { className: "size-2 rounded-full bg-ink/10 ml-1" }), _jsx("div", { className: "flex-1 h-3.5 bg-ink/10" }), _jsx("div", { className: "w-14 h-3.5 bg-ink/10" })] }, i))) })) : settlements.length === 0 ? (_jsx("div", { className: "px-7 py-6 sm:px-9", children: _jsx("p", { className: "text-sm text-ink/55", children: "Cuando se liquide el primer movimiento, quedar\u00E1 sellado aqu\u00ED." }) })) : (_jsx("ul", { className: "divide-y divide-ink/10", children: settlements.map((s, i) => {
                            const isMine = s.fromUser === currentUserId;
                            const fromName = memberById.get(s.fromUser) ?? "—";
                            const toName = memberById.get(s.toUser) ?? "—";
                            return (_jsxs("li", { className: "px-1 py-3 flex items-center gap-2 text-sm animate-print", style: { animationDelay: `${i * 50}ms` }, children: [_jsx("span", { "aria-hidden": true, className: "text-ink/35 select-none pl-1", children: "\u00B7" }), _jsxs("span", { className: "min-w-0 flex-1 text-ink/80", children: [_jsx("span", { className: s.fromUser === currentUserId
                                                    ? "font-semibold text-ink"
                                                    : "", children: fromName }), _jsx("span", { className: "text-ink/55", children: " sald\u00F3 " }), _jsx("span", { className: "font-semibold text-ink tabular-nums", children: formatCents(s.amountCents) }), _jsx("span", { className: "text-ink/55", children: " con " }), _jsx("span", { className: s.toUser === currentUserId
                                                    ? "font-semibold text-ink"
                                                    : "", children: toName })] }), isMine ? (_jsx("button", { type: "button", onClick: () => {
                                            setCancelError(null);
                                            setPendingCancel({
                                                id: s.id,
                                                name: `${fromName} → ${toName} · ${formatCents(s.amountCents)}`,
                                            });
                                        }, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-accent underline underline-offset-4 decoration-1 hover:decoration-2 transition-colors shrink-0 pr-1", children: "Deshacer" })) : (_jsx("span", { "aria-hidden": true, className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45 shrink-0 pr-1", children: "Listo" }))] }, s.id));
                        }) })), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "Cuaderno saldado." }), _jsx("span", { className: "font-mono tracking-wider", children: "#liquidadas" })] })] }), _jsx(AlertDialog, { open: pendingCancel !== null, onOpenChange: (open) => {
                    if (!open) {
                        setPendingCancel(null);
                        setCancelError(null);
                    }
                }, children: _jsxs(AlertDialogContent, { className: "bg-paper border border-ink/15 ring-0 shadow-none rounded-sm", children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/55", children: "Deshacer pago" }), _jsx(AlertDialogDescription, { className: "text-base text-ink/85", children: pendingCancel && (_jsxs(_Fragment, { children: ["\u00BFDeshacemos el pago", " ", _jsx("span", { className: "font-semibold text-ink", children: pendingCancel.name }), "? Los saldos vuelven al estado anterior."] })) })] }), cancelError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: cancelError })), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { disabled: cancelSettlement.isPending, className: "font-mono text-[10px] tracking-[0.18em] uppercase", children: "Volver" }), _jsx(AlertDialogAction, { onClick: onConfirmCancel, disabled: cancelSettlement.isPending, className: "font-mono text-[10px] tracking-[0.18em] uppercase", children: cancelSettlement.isPending ? "Deshaciendo…" : "Sí, deshacer" })] })] }) })] }));
}
