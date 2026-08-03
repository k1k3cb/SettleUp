import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { z } from "zod";
import { useCreateExpense } from "@/hooks/useCreateExpense";
import { ApiError } from "@/lib/api";
import { formatCents } from "@/lib/formatters";
const buildDraft = (members, defaultPayerId) => {
    const perMember = {};
    for (const m of members) {
        perMember[m.userId] = {
            selected: true,
            exactCents: "",
            percentage: "",
        };
    }
    return {
        description: "",
        amountInput: "",
        currency: "EUR",
        paidBy: defaultPayerId,
        method: "equal",
        perMember,
    };
};
// ---------- Conversión y validación de importes ----------
// Acepta "12", "12,5", "12.50", " 12,50 € ". Devuelve céntimos o NaN.
const parseAmountToCents = (raw) => {
    const cleaned = raw
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    if (cleaned === "" || cleaned === "-" || cleaned === ".")
        return NaN;
    const n = Number(cleaned);
    if (!Number.isFinite(n))
        return NaN;
    return Math.round(n * 100);
};
/**
 * Devuelve, para cada miembro, los céntimos que el backend asignará.
 * Implementa la misma regla que el backend: en `equal` y `percentage`,
 * el primero de la lista seleccionada se lleva el remanente para que
 * la suma cierre exactamente con el total.
 */
const computeFinalSplit = (method, members, perMember, amountCents) => {
    const result = new Map();
    const selected = members.filter((m) => perMember[m.userId]?.selected);
    if (selected.length === 0 || !Number.isFinite(amountCents))
        return result;
    if (method === "equal") {
        const n = selected.length;
        const base = Math.floor(amountCents / n);
        const remainder = amountCents - base * n;
        for (let i = 0; i < selected.length; i++) {
            result.set(selected[i].userId, base + (i === 0 ? remainder : 0));
        }
        return result;
    }
    if (method === "exact") {
        for (const m of selected) {
            const v = parseAmountToCents(perMember[m.userId]?.exactCents ?? "");
            result.set(m.userId, Number.isFinite(v) ? v : 0);
        }
        return result;
    }
    // percentage
    const entries = selected.map((m) => {
        const raw = (perMember[m.userId]?.percentage ?? "").replace(",", ".");
        const n = Number(raw);
        return { userId: m.userId, pct: Number.isFinite(n) ? n : 0 };
    });
    let assigned = 0;
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const isLast = i === entries.length - 1;
        const cents = isLast
            ? amountCents - assigned
            : Math.floor((e.pct / 100) * amountCents);
        result.set(e.userId, cents);
        assigned += cents;
    }
    return result;
};
// ---------- Esquema local (Zod) ----------
// Espejo del createExpenseSchema del backend. Validamos en cliente
// para fallar antes de la red; el backend vuelve a validar.
const baseShape = {
    description: z
        .string()
        .min(1, "Pon una descripción.")
        .max(120, "Máximo 120 caracteres."),
    amountCents: z
        .number()
        .int("Importe no válido.")
        .positive("El importe debe ser mayor que 0.")
        .max(100_000_000, "Importe demasiado grande."),
    currency: z
        .string()
        .length(3, "Moneda ISO de 3 letras.")
        .toUpperCase()
        .default("EUR"),
    paidBy: z.string().min(1, "Indica quién pagó."),
};
const createEqualSchema = z.object({
    ...baseShape,
    splitMethod: z.literal("equal"),
    splits: z.array(z.object({ userId: z.string().min(1) })).default([]),
});
const createExactSchema = z.object({
    ...baseShape,
    splitMethod: z.literal("exact"),
    splits: z
        .array(z.object({
        userId: z.string().min(1),
        amountCents: z
            .number()
            .int()
            .positive("Cada parte debe ser mayor que 0."),
    }))
        .min(1, "Marca al menos a una persona."),
});
const createPercentageSchema = z.object({
    ...baseShape,
    splitMethod: z.literal("percentage"),
    splits: z
        .array(z.object({
        userId: z.string().min(1),
        percentage: z
            .number()
            .positive("El porcentaje debe ser mayor que 0.")
            .max(100, "El porcentaje no puede pasar de 100."),
    }))
        .min(1, "Marca al menos a una persona."),
});
// ---------- Componente público ----------
export function ExpenseForm({ groupId, members, defaultPayerId, onClose, onCreated, }) {
    const [draft, setDraft] = useState(() => buildDraft(members, defaultPayerId));
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const create = useCreateExpense(groupId);
    const amountCents = useMemo(() => parseAmountToCents(draft.amountInput), [draft.amountInput]);
    // Preview del reparto final (lo que el backend asignará)
    const finalSplit = useMemo(() => computeFinalSplit(draft.method, members, draft.perMember, amountCents), [draft.method, draft.perMember, members, amountCents]);
    // Cálculos en vivo del desglose según método
    const breakdown = useMemo(() => {
        const selectedIds = members
            .filter((m) => draft.perMember[m.userId]?.selected)
            .map((m) => m.userId);
        if (draft.method === "equal") {
            const n = selectedIds.length;
            if (n === 0 || !Number.isFinite(amountCents)) {
                return { ok: false, sum: 0, message: "—", remainder: 0 };
            }
            const base = Math.floor(amountCents / n);
            const remainder = amountCents - base * n;
            return {
                ok: true,
                sum: amountCents,
                message: `${n} personas a partes iguales`,
                remainder: 0,
            };
        }
        if (draft.method === "exact") {
            let sum = 0;
            let anyMissing = false;
            for (const id of selectedIds) {
                const v = parseAmountToCents(draft.perMember[id]?.exactCents ?? "");
                if (!Number.isFinite(v)) {
                    anyMissing = true;
                }
                else {
                    sum += v;
                }
            }
            const matches = Number.isFinite(amountCents) && sum === amountCents;
            const diff = Number.isFinite(amountCents) ? amountCents - sum : 0;
            let message;
            if (matches) {
                message = "Cuadra";
            }
            else if (anyMissing && sum === 0) {
                message = "Faltan importes";
            }
            else if (diff > 0) {
                message = `Faltan ${formatCents(diff, draft.currency)} por asignar`;
            }
            else {
                message = `Te pasas por ${formatCents(-diff, draft.currency)}`;
            }
            return { ok: matches, sum, message, remainder: matches ? 0 : diff };
        }
        // percentage
        let sum = 0;
        let anyMissing = false;
        for (const id of selectedIds) {
            const raw = (draft.perMember[id]?.percentage ?? "").replace(",", ".");
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) {
                anyMissing = true;
            }
            else {
                sum += n;
            }
        }
        const ok = Math.abs(sum - 100) < 0.0001;
        const diff = 100 - sum;
        let message;
        if (ok) {
            message = "Suma 100 %";
        }
        else if (anyMissing && sum === 0) {
            message = "Faltan %";
        }
        else if (diff > 0) {
            message = `Faltan ${diff.toFixed(2)} %`;
        }
        else {
            message = `Te pasas por ${(-diff).toFixed(2)} %`;
        }
        return { ok, sum, message, remainder: ok ? 0 : diff };
    }, [draft, members, amountCents]);
    const update = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
    const toggleMember = (userId) => setDraft((d) => ({
        ...d,
        perMember: {
            ...d.perMember,
            [userId]: { ...d.perMember[userId], selected: !d.perMember[userId].selected },
        },
    }));
    const setMemberExact = (userId, value) => setDraft((d) => ({
        ...d,
        perMember: {
            ...d.perMember,
            [userId]: { ...d.perMember[userId], exactCents: value },
        },
    }));
    const setMemberPercentage = (userId, value) => setDraft((d) => ({
        ...d,
        perMember: {
            ...d.perMember,
            [userId]: { ...d.perMember[userId], percentage: value },
        },
    }));
    // ---------- Auto-corrección ----------
    /**
     * En `exact`: reparte el remanente entre todos los seleccionados
     * de forma proporcional a lo que ya tienen. Si nadie tiene, lo
     * reparte a partes iguales y el remanente va al primero.
     */
    const distributeRemainderExact = () => {
        if (!Number.isFinite(amountCents))
            return;
        const selected = members.filter((m) => draft.perMember[m.userId]?.selected);
        if (selected.length === 0)
            return;
        const current = selected.map((m) => ({
            userId: m.userId,
            cents: parseAmountToCents(draft.perMember[m.userId]?.exactCents ?? ""),
        }));
        const known = current.filter((c) => Number.isFinite(c.cents) && c.cents > 0);
        const knownSum = known.reduce((s, c) => s + c.cents, 0);
        const diff = amountCents - knownSum;
        if (Math.abs(diff) < 1)
            return;
        let assigned = 0;
        const next = {};
        for (let i = 0; i < current.length; i++) {
            const { userId, cents } = current[i];
            if (cents > 0 && knownSum > 0 && known.length > 0) {
                const share = Math.floor((cents / knownSum) * diff);
                const newCents = cents + share;
                assigned += share;
                next[userId] = (newCents / 100).toFixed(2).replace(".", ",");
            }
        }
        // El primer seleccionado con importe conocido (o el primero de la lista)
        // se lleva el remanente para que la suma cierre exactamente.
        const sink = known[0]?.userId ?? current[0]?.userId ?? selected[0].userId;
        const sinkCents = parseAmountToCents(next[sink] ?? "0") + (diff - assigned);
        next[sink] = (sinkCents / 100).toFixed(2).replace(".", ",");
        setDraft((d) => {
            const perMember = { ...d.perMember };
            for (const [userId, value] of Object.entries(next)) {
                if (perMember[userId]) {
                    perMember[userId] = { ...perMember[userId], exactCents: value };
                }
            }
            return { ...d, perMember };
        });
    };
    /**
     * En `percentage`: pone 100% en el primero seleccionado y 0% en el resto.
     * Útil para "todo para mí".
     */
    const giveAllToFirst = () => {
        const selected = members.filter((m) => draft.perMember[m.userId]?.selected);
        if (selected.length === 0)
            return;
        setDraft((d) => {
            const perMember = { ...d.perMember };
            for (let i = 0; i < selected.length; i++) {
                const id = selected[i].userId;
                perMember[id] = {
                    ...perMember[id],
                    percentage: i === 0 ? "100" : "0",
                };
            }
            return { ...d, perMember };
        });
    };
    /**
     * Reparte 100% a partes iguales entre los seleccionados.
     * El primero se lleva el remanente en小数 para que la suma cierre 100.
     */
    const distributeEqualPercentage = () => {
        const selected = members.filter((m) => draft.perMember[m.userId]?.selected);
        const n = selected.length;
        if (n === 0)
            return;
        // Dos decimales es lo que el backend acepta (multipleOf 0.01).
        const base = Math.floor((100 / n) * 100) / 100;
        const remainder = +(100 - base * n).toFixed(2);
        setDraft((d) => {
            const perMember = { ...d.perMember };
            for (let i = 0; i < selected.length; i++) {
                const id = selected[i].userId;
                const pct = i === 0 ? +(base + remainder).toFixed(2) : base;
                perMember[id] = {
                    ...perMember[id],
                    percentage: pct.toFixed(2).replace(/\.?0+$/, "").replace(".", ","),
                };
            }
            return { ...d, perMember };
        });
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setErrors({});
        const selectedIds = members
            .filter((m) => draft.perMember[m.userId]?.selected)
            .map((m) => m.userId);
        if (selectedIds.length === 0) {
            setFormError("Marca al menos a una persona en el reparto.");
            return;
        }
        if (!breakdown.ok) {
            setFormError("El reparto no cuadra con el importe.");
            return;
        }
        const base = {
            description: draft.description.trim(),
            amountCents,
            currency: draft.currency,
            paidBy: draft.paidBy,
        };
        let payload;
        if (draft.method === "equal") {
            payload = {
                ...base,
                splitMethod: "equal",
                splits: selectedIds.map((userId) => ({ userId })),
            };
        }
        else if (draft.method === "exact") {
            payload = {
                ...base,
                splitMethod: "exact",
                splits: selectedIds.map((userId) => ({
                    userId,
                    amountCents: parseAmountToCents(draft.perMember[userId]?.exactCents ?? ""),
                })),
            };
        }
        else {
            payload = {
                ...base,
                splitMethod: "percentage",
                splits: selectedIds.map((userId) => ({
                    userId,
                    percentage: Number((draft.perMember[userId]?.percentage ?? "").replace(",", ".")),
                })),
            };
        }
        const schema = draft.method === "equal"
            ? createEqualSchema
            : draft.method === "exact"
                ? createExactSchema
                : createPercentageSchema;
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
            const fieldErrors = {};
            for (const issue of parsed.error.issues) {
                const key = issue.path.join(".");
                if (!fieldErrors[key])
                    fieldErrors[key] = issue.message;
            }
            setErrors(fieldErrors);
            return;
        }
        try {
            await create.mutateAsync(parsed.data);
            onCreated?.();
            onClose();
        }
        catch (err) {
            if (err instanceof ApiError) {
                setFormError(err.message);
            }
            else {
                setFormError("No hemos podido apuntar el gasto.");
            }
        }
    };
    return (_jsx("form", { onSubmit: onSubmit, noValidate: true, className: "receipt animate-print max-h-[calc(100dvh-2rem)] overflow-y-auto", "aria-label": "Anotar gasto", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Nuevo apunte" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "+ 001" }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Cerrar", className: "text-ink/45 hover:text-ink transition-colors", children: _jsx(X, { className: "size-3.5", strokeWidth: 2.25, "aria-hidden": true }) })] })] }), _jsxs("div", { className: "px-7 py-7 sm:px-9 sm:py-8 space-y-7", children: [formError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: formError })), _jsxs("div", { className: "space-y-5", children: [_jsx(DescriptionRow, { value: draft.description, onChange: (v) => update("description")(v), error: errors.description }), _jsxs("div", { className: "grid grid-cols-[1fr_auto_auto] gap-x-4 items-end", children: [_jsx(AmountRow, { value: draft.amountInput, onChange: (v) => update("amountInput")(v), error: errors.amountCents, previewCents: amountCents, currency: draft.currency }), _jsx(ReceiptRow, { label: "Moneda", children: _jsx("input", { type: "text", value: draft.currency, onChange: (e) => update("currency")(e.target.value.toUpperCase()), maxLength: 3, className: "w-14 bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono text-center outline-none transition-colors uppercase" }) })] }), _jsx(PaidByRow, { value: draft.paidBy, onChange: (v) => update("paidBy")(v), members: members, error: errors.paidBy })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "Reparto" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: [
                                        { id: "equal", label: "Partes iguales" },
                                        { id: "exact", label: "Montos exactos" },
                                        { id: "percentage", label: "Porcentaje" },
                                    ].map((opt) => {
                                        const active = draft.method === opt.id;
                                        return (_jsx("button", { type: "button", onClick: () => update("method")(opt.id), "aria-pressed": active, className: `px-2 py-2 text-xs font-mono tracking-[0.06em] uppercase border rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 ${active
                                                ? "border-ink/60 bg-ink/[0.04] text-ink"
                                                : "border-ink/15 border-dashed text-ink/55 hover:border-ink/30 hover:text-ink/80"}`, children: opt.label }, opt.id));
                                    }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-3", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "Entre" }), _jsx("p", { className: `font-mono text-[10px] tracking-[0.18em] uppercase ${breakdown.ok ? "text-ink/70" : "text-accent"}`, "aria-live": "polite", children: breakdown.ok ? (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Check, { className: "size-3", strokeWidth: 2.5, "aria-hidden": true }), breakdown.message] })) : (breakdown.message) })] }), _jsx("ul", { className: "border-y border-dashed border-ink/20 divide-y divide-ink/10", children: members.map((m) => {
                                        const cell = draft.perMember[m.userId];
                                        const assigned = finalSplit.get(m.userId);
                                        return (_jsxs("li", { className: "flex items-center gap-3 px-1 py-2.5", children: [_jsxs("label", { className: "inline-flex items-center gap-2 flex-1 min-w-0 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: cell.selected, onChange: () => toggleMember(m.userId), className: "size-4 accent-[var(--color-accent)]" }), _jsx("span", { className: "truncate text-sm", children: m.name })] }), cell.selected && draft.method === "exact" && (_jsx("input", { type: "text", inputMode: "decimal", value: cell.exactCents, onChange: (e) => setMemberExact(m.userId, e.target.value), placeholder: "0,00", "aria-label": `Importe para ${m.name}`, className: "w-24 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30" })), cell.selected && draft.method === "percentage" && (_jsxs("div", { className: "flex items-center justify-end gap-3", children: [_jsxs("div", { className: "w-16 flex items-center justify-end gap-1", children: [_jsx("input", { type: "text", inputMode: "decimal", value: cell.percentage, onChange: (e) => setMemberPercentage(m.userId, e.target.value), placeholder: "0", "aria-label": `Porcentaje para ${m.name}`, className: "w-12 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30" }), _jsx("span", { className: "font-mono text-xs text-ink/45", children: "%" })] }), _jsx("span", { className: "w-20 text-right font-mono text-xs text-ink/55 tabular-nums", title: "Importe calculado a este porcentaje", children: Number.isFinite(assigned ?? NaN)
                                                                ? formatCents(assigned, draft.currency)
                                                                : "—" })] })), draft.method === "equal" && (_jsx("span", { className: "w-20 text-right font-mono text-sm text-ink/85 tabular-nums", children: cell.selected && Number.isFinite(assigned ?? NaN)
                                                        ? formatCents(assigned, draft.currency)
                                                        : "—" }))] }, m.userId));
                                    }) }), _jsxs("div", { className: "flex items-baseline justify-between gap-3 pt-1", children: [_jsxs("div", { className: "flex items-baseline gap-3", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "\u03A3" }), _jsx("p", { className: `font-mono text-sm tabular-nums ${breakdown.ok ? "text-ink" : "text-accent"}`, children: draft.method === "percentage"
                                                        ? `${breakdown.sum.toFixed(2)} %`
                                                        : formatCents(breakdown.sum, draft.currency) }), draft.method !== "percentage" &&
                                                    Number.isFinite(amountCents) && (_jsxs("p", { className: "font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45", children: ["de ", formatCents(amountCents, draft.currency)] })), draft.method === "percentage" && (_jsx("p", { className: "font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45", children: "de 100 %" }))] }), draft.method === "exact" && !breakdown.ok && (_jsx("button", { type: "button", onClick: distributeRemainderExact, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2", children: "Repartir el resto" })), draft.method === "percentage" && !breakdown.ok && (_jsx("button", { type: "button", onClick: distributeEqualPercentage, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2", children: "A partes iguales" }))] }), errors.splits && (_jsx("p", { className: "font-mono text-[11px] text-accent", children: errors.splits }))] }), _jsxs("div", { className: "flex items-center gap-5 pt-1", children: [_jsxs("button", { type: "submit", disabled: create.isPending ||
                                        !breakdown.ok ||
                                        !draft.description.trim() ||
                                        !Number.isFinite(amountCents) ||
                                        amountCents <= 0 ||
                                        members.filter((m) => draft.perMember[m.userId]?.selected)
                                            .length === 0, className: "group relative disabled:opacity-50 disabled:cursor-not-allowed", title: !breakdown.ok
                                        ? "El reparto no cuadra con el importe."
                                        : !draft.description.trim()
                                            ? "Escribe una descripción."
                                            : !Number.isFinite(amountCents) || amountCents <= 0
                                                ? "Introduce un importe válido."
                                                : undefined, children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsxs("span", { className: "relative inline-flex items-center gap-1.5 px-5 py-2.5 text-card font-semibold tracking-wide", children: [_jsx(Plus, { className: "size-4", strokeWidth: 2.5, "aria-hidden": true }), create.isPending
                                                    ? "Anotando…"
                                                    : !breakdown.ok
                                                        ? "Sin cuadrar"
                                                        : "Anotar gasto"] })] }), _jsx("button", { type: "button", onClick: onClose, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Cancelar" })] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "El recibo se sella al confirmar." }), _jsx("span", { className: "font-mono tracking-wider", children: "#EXP" })] })] }) }));
}
function countSelected(draft, members) {
    return members.filter((m) => draft.perMember[m.userId]?.selected).length;
}
function ReceiptRow({ label, error, htmlFor, children, }) {
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: htmlFor, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block", children: label }), children, error && _jsx("p", { className: "font-mono text-[11px] text-accent", children: error })] }));
}
/**
 * Sub-componentes por fila del form. Cada uno genera un id único con
 * `useId()` y lo pasa al label (`htmlFor`) y al control (`id`). Esto
 * es lo que faltaba en el `ReceiptRow` original: el label era
 * `<label>` de bloque sin asociación con el control, lo que rompe
 * la accesibilidad y los tests con Testing Library.
 */
function DescriptionRow({ value, onChange, error, }) {
    const id = useId();
    return (_jsx(ReceiptRow, { label: "Descripci\u00F3n", error: error, htmlFor: id, children: _jsx("input", { id: id, type: "text", value: value, onChange: (e) => onChange(e.target.value), maxLength: 120, placeholder: "Cena del viernes", "aria-invalid": !!error, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30" }) }));
}
function AmountRow({ value, onChange, error, previewCents, currency, }) {
    const id = useId();
    return (_jsxs(_Fragment, { children: [_jsx(ReceiptRow, { label: "Importe", error: error, htmlFor: id, children: _jsx("input", { id: id, type: "text", inputMode: "decimal", value: value, onChange: (e) => onChange(e.target.value), placeholder: "0,00", "aria-invalid": !!error, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono tracking-tight outline-none transition-colors placeholder:text-ink/30" }) }), _jsx("div", { className: "w-20 text-right font-mono text-sm text-ink/45 pb-2 tabular-nums", children: formatCents(previewCents, currency) })] }));
}
function PaidByRow({ value, onChange, members, error, }) {
    const id = useId();
    return (_jsx(ReceiptRow, { label: "Pagado por", error: error, htmlFor: id, children: _jsx("select", { id: id, value: value, onChange: (e) => onChange(e.target.value), "aria-invalid": !!error, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors appearance-none", children: members.map((m) => (_jsx("option", { value: m.userId, children: m.name }, m.userId))) }) }));
}
