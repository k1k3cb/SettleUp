import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Ban, MoreHorizontal, Plus } from "lucide-react";
import { useGroupExpenses } from "@/hooks/useGroupExpenses";
import { useCancelExpense } from "@/hooks/useCancelExpense";
import { useGroupId } from "@/hooks/useGroupId";
import { formatCents, formatShortDate } from "@/lib/formatters";
import { ApiError } from "@/lib/api";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseDetailsSheet } from "@/components/expenses/ExpenseDetailsSheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip";
export function ExpensesSection({ groupId, currentUserId, members, membersLoading, membersError, formOpen, onOpenForm, onCloseForm, onCountChange, }) {
    const canOpenForm = !!members && members.length > 0 && !membersError;
    const expensesQuery = useGroupExpenses(groupId);
    const expenses = expensesQuery.data ?? null;
    const count = expenses?.length ?? 0;
    const countLabel = count.toString().padStart(2, "0");
    // Callback en un ref, useEffect solo depende del valor. Evita el
    // bucle infinito si el padre pasa el callback inline.
    const onCountChangeRef = useRef(onCountChange);
    useEffect(() => {
        onCountChangeRef.current = onCountChange;
    });
    useEffect(() => {
        onCountChangeRef.current?.(expenses ? expenses.length : null);
    }, [expenses]);
    const [selectedExpense, setSelectedExpense] = useState(null);
    return (_jsxs("section", { "aria-label": "Gastos de la cuenta", className: "space-y-3", children: [_jsxs("div", { className: "flex items-baseline justify-between px-1", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Apuntes" }), _jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40", children: expensesQuery.isLoading ? "…" : countLabel })] }), _jsx("article", { className: "receipt relative", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: expensesQuery.isLoading
                                        ? "Cargando…"
                                        : count === 0
                                            ? "Aún sin apuntes"
                                            : "Últimos apuntes" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2014" })] }), expensesQuery.isError ? (_jsx("div", { className: "px-7 py-6 sm:px-9", children: _jsx("p", { className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: expensesQuery.error.message }) })) : expenses && expenses.length > 0 ? (_jsx("ul", { className: "divide-y divide-ink/10", children: expenses.map((e, i) => (_jsx(ExpenseRow, { index: i, expense: e, paidByName: members?.find((m) => m.userId === e.paidBy)?.name ?? "—", canCancel: e.paidBy === currentUserId, onOpen: () => setSelectedExpense(e) }, e.id))) })) : !expensesQuery.isLoading ? (_jsx("div", { className: "px-7 py-7 sm:px-9 space-y-5", children: _jsx("p", { className: "text-sm text-ink/65 max-w-xs", children: "Anota el primer gasto de la cuenta. La lista se ir\u00E1 rellenando conforme se sumen m\u00E1s." }) })) : (_jsx("ul", { "aria-hidden": true, children: [0, 1, 2].map((i) => (_jsxs("li", { className: "px-7 py-4 sm:px-9 border-b border-ink/10 last:border-b-0", children: [_jsx("div", { className: "h-3.5 w-1/2 bg-ink/10" }), _jsx("div", { className: "mt-2 h-2.5 w-1/3 bg-ink/5" })] }, i))) })), membersError ? (_jsx("div", { className: "px-7 pt-2 pb-7 sm:px-9", children: _jsx("p", { className: "font-mono text-[11px] text-accent border-l-2 border-accent pl-3 py-1", children: membersError }) })) : membersLoading ? (_jsx("div", { className: "px-7 pt-2 pb-7 sm:px-9", children: _jsx("div", { className: "h-9 w-48 bg-ink/5", "aria-hidden": true }) })) : (_jsx("div", { className: "px-7 pt-2 pb-7 sm:px-9", children: _jsxs("button", { type: "button", onClick: onOpenForm, disabled: !canOpenForm, className: "group/btn relative disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsxs("span", { className: "relative inline-flex items-center gap-1.5 px-5 py-2.5 text-card font-semibold tracking-wide", children: [_jsx(Plus, { className: "size-4", strokeWidth: 2.5, "aria-hidden": true }), count === 0 ? "Anotar gasto" : "Anotar otro"] })] }) })), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: count === 0
                                        ? "El primer apunte es el más difícil."
                                        : "Cada apunte, una línea del cuaderno." }), _jsx("span", { className: "font-mono tracking-wider", children: "#gastos" })] })] }) }), formOpen && members && (_jsx(Dialog, { open: formOpen, onOpenChange: (open) => {
                    if (!open)
                        onCloseForm();
                }, children: _jsx(DialogContent, { showCloseButton: false, className: "bg-paper border border-ink/15 ring-0 shadow-none p-0 rounded-sm max-w-md gap-0 max-h-[calc(100dvh-2rem)] overflow-hidden", children: _jsx(ExpenseForm, { groupId: groupId, members: members, defaultPayerId: currentUserId || members[0]?.userId || "", onClose: onCloseForm }) }) })), selectedExpense && (_jsx(ExpenseDetailsSheet, { expense: selectedExpense, members: members ?? [], payerName: (selectedExpense &&
                    members?.find((m) => m.userId === selectedExpense.paidBy)?.name) ??
                    "—", open: !!selectedExpense, onOpenChange: (open) => {
                    if (!open)
                        setSelectedExpense(null);
                } }))] }));
}
function ExpenseRow({ index, expense, paidByName, canCancel, onOpen, }) {
    const groupId = useGroupId();
    const cancel = useCancelExpense(groupId);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState(null);
    const onConfirm = async () => {
        setError(null);
        try {
            await cancel.mutateAsync(expense.id);
            setConfirmOpen(false);
        }
        catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            }
            else {
                setError("No hemos podido anularlo.");
            }
        }
    };
    return (_jsxs("li", { className: "group/row relative", children: [_jsxs(Tooltip, { children: [_jsxs(TooltipTrigger, { render: _jsx("button", { type: "button", onClick: onOpen, className: "w-full text-left flex items-center gap-4 px-7 py-4 sm:px-9 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors" }), children: [_jsxs("span", { className: "font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0", children: [",", (index + 1).toString().padStart(2, "0")] }), _jsxs("span", { className: "min-w-0 flex-1 block", children: [_jsx("span", { className: "block truncate text-base font-semibold tracking-[-0.01em] text-ink", children: expense.description }), _jsxs("span", { className: "block font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45", children: ["Pag\u00F3 ", paidByName, _jsx("span", { className: "text-ink/30", "aria-hidden": true, children: " · " }), _jsx("time", { dateTime: expense.createdAt, title: formatShortDate(expense.createdAt), children: formatShortDate(expense.createdAt) })] })] }), _jsx("span", { className: "font-mono text-sm tabular-nums text-ink/85", children: formatCents(expense.amountCents, expense.currency) }), !canCancel && (_jsx("span", { "aria-hidden": true, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/30", children: "\u2014" }))] }), _jsx(TooltipContent, { side: "top", sideOffset: 6, children: "Ver detalle del apunte" })] }), canCancel && (_jsx("div", { className: "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2", children: _jsx(RowMenu, { onRequestCancel: () => {
                        setError(null);
                        setConfirmOpen(true);
                    } }) })), _jsx(AlertDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, children: _jsxs(AlertDialogContent, { className: "bg-paper border border-ink/15 ring-0 shadow-none rounded-sm", children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/55", children: "Anular gasto" }), _jsxs(AlertDialogDescription, { className: "text-base text-ink/85", children: ["\u00BFAnular \u00AB", expense.description, "\u00BB? El apunte deja de contar en los saldos. Si te equivocaste, anota despu\u00E9s el gasto correcto."] })] }), error && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: error })), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { disabled: cancel.isPending, className: "font-mono text-[10px] tracking-[0.18em] uppercase", children: "No, volver" }), _jsx(AlertDialogAction, { onClick: onConfirm, disabled: cancel.isPending, variant: "destructive", className: "font-mono text-[10px] tracking-[0.18em] uppercase", children: cancel.isPending ? "Anulando…" : "Sí, anular" })] })] }) })] }));
}
function RowMenu({ onRequestCancel }) {
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { "aria-label": "Acciones del apunte", className: "text-ink/35 hover:text-ink transition-colors p-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40", children: _jsx(MoreHorizontal, { className: "size-4", strokeWidth: 2, "aria-hidden": true }) }), _jsx(DropdownMenuContent, { align: "end", sideOffset: 4, className: "bg-paper border border-ink/15 shadow-md ring-1 ring-foreground/10 rounded-sm min-w-40", children: _jsxs(DropdownMenuItem, { variant: "destructive", onClick: onRequestCancel, className: "font-mono text-[10px] tracking-[0.18em] uppercase", children: [_jsx(Ban, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true }), "Anular gasto"] }) })] }));
}
