import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Eye } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, } from "@/components/ui/sheet";
import { formatCents, formatLongDateTime } from "@/lib/formatters";
const methodLabel = {
    equal: "Partes iguales",
    exact: "Montos exactos",
    percentage: "Porcentaje",
};
export function ExpenseDetailsSheet({ expense, members, payerName, open, onOpenChange, }) {
    return (_jsx(Sheet, { open: open, onOpenChange: onOpenChange, children: _jsxs(SheetContent, { side: "right", showCloseButton: false, className: "bg-paper border-l border-ink/15 shadow-none p-0 gap-0 sm:max-w-md", children: [expense ? (_jsx(Detail, { expense: expense, members: members, payerName: payerName, onClose: () => onOpenChange(false) })) : null, _jsx(SheetTitle, { className: "sr-only", children: "Detalle del apunte" })] }) }));
}
function Detail({ expense, members, payerName, onClose, }) {
    const memberById = new Map(members.map((m) => [m.userId, m.name]));
    // Para "percentage" calculamos el % real a partir de owedAmountCents
    // (es lo que el backend guardó tras aplicar el reparto). Es la
    // información fiel a lo que se creó.
    const rows = expense.splits.map((s) => {
        const name = memberById.get(s.userId) ?? "—";
        if (expense.splitMethod === "percentage") {
            const pct = expense.amountCents
                ? (s.owedAmountCents / expense.amountCents) * 100
                : 0;
            return {
                userId: s.userId,
                name,
                cents: s.owedAmountCents,
                pct,
            };
        }
        return { userId: s.userId, name, cents: s.owedAmountCents, pct: null };
    });
    return (_jsx("article", { className: "receipt animate-print flex flex-col h-full overflow-y-auto", "aria-label": "Detalle del apunte", children: _jsxs("div", { className: "bg-card border-x border-ink/12 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: [_jsx(Eye, { className: "size-3", strokeWidth: 2.25, "aria-hidden": true }), "Apunte"] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u00B7 001" }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Cerrar", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors", children: "Cerrar" })] })] }), _jsxs("div", { className: "px-7 py-7 sm:px-9 sm:py-8 space-y-7", children: [_jsxs("header", { children: [_jsx("h2", { className: "text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]", children: expense.description }), _jsx("p", { className: "mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45", children: formatLongDateTime(expense.createdAt) })] }), _jsxs("dl", { className: "space-y-5", children: [_jsx(Row, { label: "Importe", children: _jsx("span", { className: "font-mono text-base tabular-nums text-ink", children: formatCents(expense.amountCents, expense.currency) }) }), _jsx(Row, { label: "Pagado por", children: _jsx("span", { className: "text-base text-ink", children: payerName }) }), _jsx(Row, { label: "Reparto", children: _jsx("span", { className: "text-base text-ink", children: methodLabel[expense.splitMethod] }) })] }), _jsxs("section", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "Entre" }), _jsxs("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45", children: [rows.length, " ", rows.length === 1 ? "persona" : "personas"] })] }), _jsx("ul", { className: "border-y border-dashed border-ink/20 divide-y divide-ink/10", children: rows.map((r) => (_jsxs("li", { className: "flex items-center gap-3 px-1 py-2.5", children: [_jsx("span", { className: "flex-1 min-w-0 truncate text-sm", children: r.name }), r.pct !== null && (_jsxs("span", { className: "font-mono text-xs tabular-nums text-ink/55 w-14 text-right", children: [r.pct.toFixed(2).replace(/\.?0+$/, ""), " %"] })), _jsx("span", { className: "font-mono text-sm tabular-nums text-ink w-24 text-right", children: formatCents(r.cents, expense.currency) })] }, r.userId))) }), _jsxs("div", { className: "flex items-baseline justify-between pt-1", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "\u03A3" }), _jsx("p", { className: "font-mono text-sm tabular-nums text-ink", children: formatCents(rows.reduce((s, r) => s + r.cents, 0), expense.currency) })] })] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "Solo lectura. Para rectificar, anula y anota de nuevo." }), _jsx("span", { className: "font-mono tracking-wider", children: "#EXP" })] })] }) }));
}
function Row({ label, children, }) {
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("dt", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: label }), _jsx("dd", { children: children })] }));
}
