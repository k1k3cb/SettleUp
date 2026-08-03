import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, Copy } from "lucide-react";
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
export function Notebook({ group, currentUserId, currentUserName, copied, onCopy, expenseFormOpen, onOpenExpenseForm, onCloseExpenseForm, activeTab, onActiveTabChange, counts, onCountChange, }) {
    const isOwner = group.createdBy === currentUserId;
    const membersQuery = useGroupMembers(group.id);
    const members = membersQuery.data ?? null;
    // TanStack Query deduplica por queryKey, así que esta llamada
    // reutiliza el cache que carga <Balances/> debajo. Sin fetch doble.
    const balancesQuery = useGroupBalances(group.id);
    const isSettled = balancesQuery.data?.isSettled;
    return (_jsxs("main", { className: "mt-10 sm:mt-12 space-y-6", children: [_jsx("article", { className: "receipt relative animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-start justify-between gap-4 border-b border-ink/10 px-7 pt-7 pb-6 sm:px-9", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/55", children: "Cuenta" }), _jsx("h1", { className: "mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.02] text-ink", children: group.name }), _jsxs("p", { className: "mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45", children: ["Abierta el ", formatLongDate(group.createdAt)] }), isSettled && _jsx(SettledStamp, {})] }), _jsx(InviteStamp, { copied: copied, onClick: onCopy })] }), _jsxs("div", { className: "px-7 pt-6 pb-2 sm:px-9", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Invitaci\u00F3n" }), _jsxs("button", { type: "button", onClick: onCopy, "aria-label": "Copiar c\u00F3digo de invitaci\u00F3n", className: "mt-3 w-full flex items-center justify-between gap-3 border border-ink/15 border-dashed px-4 py-3 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors rounded-sm", children: [_jsx("span", { className: "font-mono text-base tracking-[0.1em] text-ink/85", children: formatInviteCodeLocal(group.inviteCode) }), _jsx("span", { className: "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: copied ? (_jsxs(_Fragment, { children: ["Copiado", _jsx(Check, { className: "size-3.5 text-accent", strokeWidth: 2.5, "aria-hidden": true })] })) : (_jsxs(_Fragment, { children: ["Copiar", _jsx(Copy, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true })] })) })] }), _jsx("p", { className: "mt-3 text-xs text-ink/55", children: "Comparte este c\u00F3digo para que alguien se una a la cuenta." })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: isOwner ? "Eres quien abrió esta cuenta." : "Te uniste a esta cuenta." }), _jsxs("span", { className: "font-mono tracking-wider", children: ["#", group.id.slice(0, 3).toUpperCase()] })] })] }) }), _jsxs(Tabs, { value: activeTab, onValueChange: (v) => onActiveTabChange(v), className: "flex flex-col gap-4", children: [_jsxs(TabsList, { variant: "line", className: "bg-transparent border-b border-ink/15 rounded-none p-0 h-auto justify-start gap-1 text-ink/55", children: [_jsx(TabTrigger, { value: "signers", label: "Firmantes", count: counts.signers }), _jsx(TabTrigger, { value: "expenses", label: "Apuntes", count: counts.expenses }), _jsx(TabTrigger, { value: "balances", label: "Saldos", count: counts.balances })] }), _jsx(TabsContent, { value: "signers", className: "mt-0 focus-visible:outline-none", children: _jsx(SignersSection, { group: group, currentUserId: currentUserId, members: members, membersLoading: membersQuery.isLoading, membersError: membersQuery.error ? membersQuery.error.message : null, onCountChange: (n) => onCountChange("signers", n) }) }), _jsx(TabsContent, { value: "expenses", className: "mt-0 focus-visible:outline-none", children: _jsx(ExpensesSection, { groupId: group.id, currentUserId: currentUserId, members: members, membersLoading: membersQuery.isLoading, membersError: membersQuery.error ? membersQuery.error.message : null, formOpen: expenseFormOpen, onOpenForm: onOpenExpenseForm, onCloseForm: onCloseExpenseForm, onCountChange: (n) => onCountChange("expenses", n) }) }), _jsx(TabsContent, { value: "balances", className: "mt-0 focus-visible:outline-none", children: _jsx(BalancesSection, { groupId: group.id, currentUserId: currentUserId, currentUserName: currentUserName, members: (members ?? []), onCountChange: (n) => onCountChange("balances", n) }) })] })] }));
}
// `formatInviteCode` es una utilidad local del cuaderno: limpia el
// string y lo divide con un punto medio para legibilidad.
function formatInviteCodeLocal(raw) {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (clean.length <= 4)
        return clean;
    return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
}
