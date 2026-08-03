import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { groupsService } from "@/services/groups";
import { ApiError } from "@/lib/api";
import { formatShortDateWithYear, pad2 } from "@/lib/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const formatInviteCode = (raw) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (clean.length <= 4)
        return clean;
    return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
};
// Alias con el nombre histórico de esta página.
const formatCreatedAt = formatShortDateWithYear;
export function GroupsPage() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();
    const [groups, setGroups] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [mode, setMode] = useState("idle");
    const [name, setName] = useState("");
    const [invite, setInvite] = useState("");
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    useEffect(() => {
        if (isPending)
            return;
        if (!session) {
            navigate("/signin", { replace: true });
            return;
        }
        void load();
    }, [isPending, session, navigate]);
    const load = async () => {
        setLoadError(null);
        try {
            const data = await groupsService.list();
            setGroups(data);
            // Si no hay grupos pendientes pero sí saldados, salta directo
            // a la tab "Saldados" en lugar de mostrar una tab vacía por
            // defecto. Si todo está saldado, también.
            const hasPending = data.some((g) => !g.isSettled);
            if (!hasPending)
                setActiveTab("settled");
        }
        catch (err) {
            setLoadError(err instanceof Error
                ? err.message
                : "No hemos podido cargar tus cuentas.");
        }
    };
    const openMode = (next) => {
        setMode(next);
        setErrors({});
        setFormError(null);
        setName("");
        setInvite("");
    };
    const cancel = () => {
        setMode("idle");
        setErrors({});
        setFormError(null);
    };
    const onCreate = async (e) => {
        e.preventDefault();
        setFormError(null);
        const trimmed = name.trim();
        if (!trimmed) {
            setErrors({ name: "Pon un nombre para la cuenta." });
            return;
        }
        if (trimmed.length > 80) {
            setErrors({ name: "Máximo 80 caracteres." });
            return;
        }
        setSubmitting(true);
        try {
            const created = await groupsService.create(trimmed);
            setGroups((prev) => (prev ? [created, ...prev] : [created]));
            setMode("idle");
            setName("");
        }
        catch (err) {
            if (err instanceof ApiError) {
                setFormError(err.message);
            }
            else {
                setFormError("No hemos podido crear la cuenta.");
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    const onJoin = async (e) => {
        e.preventDefault();
        setFormError(null);
        // El backend normaliza a minúsculas, pero mandamos minúsculas ya
        // normalizadas para evitar depender solo de esa normalización.
        const code = invite.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (code.length < 6) {
            setErrors({ inviteCode: "El código tiene al menos 6 caracteres." });
            return;
        }
        setSubmitting(true);
        try {
            const joined = await groupsService.join(code);
            setGroups((prev) => {
                if (!prev)
                    return [joined];
                if (prev.some((g) => g.id === joined.id))
                    return prev;
                return [joined, ...prev];
            });
            setMode("idle");
            setInvite("");
        }
        catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 404) {
                    setFormError("Ese código no corresponde a ninguna cuenta.");
                }
                else if (err.status === 409) {
                    setFormError("Ya formas parte de esa cuenta.");
                }
                else {
                    setFormError(err.message);
                }
            }
            else {
                setFormError("No hemos podido entrar en la cuenta.");
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    const onCopy = async (g) => {
        try {
            await navigator.clipboard.writeText(g.inviteCode);
            setCopiedId(g.id);
            window.setTimeout(() => {
                setCopiedId((current) => (current === g.id ? null : current));
            }, 1600);
        }
        catch {
            /* clipboard no disponible: no rompemos la UI */
        }
    };
    if (isPending || !session) {
        return (_jsx("div", { className: "min-h-screen bg-paper flex items-center justify-center", children: _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45", children: "Comprobando\u2026" }) }));
    }
    // Filtros por tab. El backend ya calcula `isSettled` por grupo
    // (vista global: todos los miembros a 0). Filtramos en cliente:
    // O(N) sobre un array pequeño, no es N+1.
    const settled = (groups ?? []).filter((g) => g.isSettled);
    const pending = (groups ?? []).filter((g) => !g.isSettled);
    const settledCount = settled.length.toString().padStart(2, "0");
    const pendingCount = pending.length.toString().padStart(2, "0");
    // El Hero muestra los pendientes (lo que requiere acción), no el
    // total. Si no hay pendientes pero hay grupos, "al día" + saldados
    // como sub-label. Si no hay grupos, "sin cuentas".
    const totalGroups = groups?.length ?? 0;
    const heroLabel = totalGroups === 0
        ? "sin cuentas"
        : pending.length === 0
            ? "al día"
            : pending.length === 1
                ? "pendiente por cuadrar"
                : "pendientes por cuadrar";
    return (_jsx("div", { className: "min-h-screen bg-paper text-ink", children: _jsxs("div", { className: "mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-16 sm:pb-24", children: [_jsx(PageHeader, { userName: session.user.name, onSignOut: async () => {
                        await signOut();
                        navigate("/signin", { replace: true });
                    } }), _jsx(Hero, { count: pending.length, label: heroLabel, settledCount: settledCount, totalGroups: totalGroups }), groups === null ? (_jsx(List, { groups: groups, loadError: loadError, onRetry: load, copiedId: copiedId, onCopy: onCopy, onOpen: (id) => navigate(`/groups/${id}`), currentUserId: session.user.id })) : (_jsxs(Tabs, { value: activeTab, onValueChange: (v) => setActiveTab(v), className: "flex flex-col gap-4", children: [_jsxs(TabsList, { variant: "line", className: "bg-transparent border-b border-ink/15 rounded-none p-0 h-auto justify-start gap-1 text-ink/55", children: [_jsx(GroupsTab, { value: "pending", label: "Pendientes", count: pendingCount, isActive: activeTab === "pending" }), _jsx(GroupsTab, { value: "settled", label: "Saldados", count: settledCount, isActive: activeTab === "settled" })] }), _jsx(TabsContent, { value: "pending", className: "mt-0 focus-visible:outline-none", children: pending.length === 0 ? (_jsx(EmptyState, { title: "Al d\u00EDa.", hint: "No hay cuentas pendientes. Si abres una nueva, aparecer\u00E1 aqu\u00ED." })) : (_jsx(List, { groups: pending, loadError: null, onRetry: load, copiedId: copiedId, onCopy: onCopy, onOpen: (id) => navigate(`/groups/${id}`), currentUserId: session.user.id })) }), _jsx(TabsContent, { value: "settled", className: "mt-0 focus-visible:outline-none", children: settled.length === 0 ? (_jsx(EmptyState, { title: "Sin liquidar todav\u00EDa.", hint: "Cuando se cierre la primera cuenta, quedar\u00E1 sellada aqu\u00ED." })) : (_jsx(List, { groups: settled, loadError: null, onRetry: load, copiedId: copiedId, onCopy: onCopy, onOpen: (id) => navigate(`/groups/${id}`), currentUserId: session.user.id })) })] })), _jsx(Stubs, { mode: mode, onOpen: openMode }), mode !== "idle" && (_jsx("div", { className: "mt-6", children: mode === "create" ? (_jsx(CreateForm, { name: name, error: errors.name, formError: formError, submitting: submitting, onName: setName, onSubmit: onCreate, onCancel: cancel })) : (_jsx(JoinForm, { value: invite, error: errors.inviteCode, formError: formError, submitting: submitting, onChange: setInvite, onSubmit: onJoin, onCancel: cancel })) }))] }) }));
}
/**
 * Trigger de pestaña con el chrome del cuaderno. Mismo idioma que
 * el `TabTrigger` de GroupDetailPage: mono, uppercase, sin fondo,
 * con un contador a la derecha separado por `·`. El subrayado del
 * activo viene del `variant="line"` de `TabsList`. Aquí lo
 * separamos en su propio componente porque este idioma (sin la
 * lógica de counts de GroupDetailPage) es más simple y específico
 * de la lista.
 */
function GroupsTab({ value, label, count, isActive: _isActive, }) {
    return (_jsxs(TabsTrigger, { value: value, className: "rounded-none bg-transparent font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink data-active:text-ink data-active:font-medium px-3 py-2.5 h-auto data-active:bg-transparent data-active:shadow-none", children: [label, _jsx("span", { "aria-hidden": true, className: "text-ink/30", children: " \u00B7 " }), _jsx("span", { className: "tabular-nums", children: count })] }));
}
function EmptyState({ title, hint, }) {
    return (_jsx("article", { className: "receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12 px-7 py-6 sm:px-9", children: [_jsx("p", { className: "text-sm text-ink/80", children: title }), _jsx("p", { className: "mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45", children: hint })] }) }));
}
function PageHeader({ userName, onSignOut, }) {
    return (_jsxs("header", { className: "flex items-baseline justify-between", children: [_jsxs(Link, { to: "/", className: "group inline-flex items-baseline gap-1.5 font-mono text-xs tracking-[0.22em] uppercase text-ink/70 hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm", "aria-label": "Volver al inicio", children: ["SettleUp", _jsx("span", { "aria-hidden": true, className: "text-ink/35", children: "\u00B7" }), _jsx("span", { className: "text-ink/55 group-hover:text-ink transition-colors", children: "Cuentas" })] }), _jsx("button", { type: "button", onClick: onSignOut, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors", children: "Salir" }), _jsxs("span", { className: "sr-only", children: ["Sesi\u00F3n de ", userName] })] }));
}
function Hero({ count, label, settledCount, totalGroups, }) {
    // El número grande es lo que requiere acción. El sub-label
    // secundario da el contexto del cuaderno entero sin robarle
    // protagonismo a la cifra principal. Si no hay cuentas en
    // absoluto, no mostramos el sub-label: solo "sin cuentas".
    const showSettledSubLabel = totalGroups > 0;
    return (_jsxs("section", { className: "mt-10 sm:mt-14", children: [_jsxs("div", { className: "flex items-end gap-4 leading-none", children: [_jsx("span", { "aria-hidden": true, className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45 pb-3", children: "N\u00BA" }), _jsx("span", { className: "stamp origin-bottom-left text-[120px] sm:text-[152px] font-semibold tracking-[-0.04em] leading-[0.85] text-ink", children: pad2(count) })] }), _jsx("p", { className: "mt-3 font-mono text-[11px] tracking-[0.18em] uppercase text-ink/55", children: label }), showSettledSubLabel && (_jsxs("p", { className: "mt-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/35", children: [settledCount, " saldadas \u00B7 ", totalGroups, " en total"] }))] }));
}
function List({ groups, loadError, onRetry, copiedId, onCopy, onOpen, currentUserId, }) {
    if (loadError) {
        return (_jsxs("section", { className: "mt-10", children: [_jsx("p", { className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: loadError }), _jsx("button", { type: "button", onClick: onRetry, className: "mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Reintentar" })] }));
    }
    if (groups === null) {
        return (_jsx("section", { className: "mt-10 space-y-2", children: [0, 1, 2].map((i) => (_jsx("div", { className: "h-14 border-y border-dashed border-ink/10 bg-card/40" }, i))) }));
    }
    if (groups.length === 0) {
        return (_jsx("section", { className: "mt-10 receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12 px-7 py-6 sm:px-9", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Vac\u00EDo" }), _jsx("p", { className: "mt-2 text-base text-ink/80", children: "A\u00FAn no tienes cuentas. Abre la primera abajo." })] }) }));
    }
    return (_jsx("section", { className: "mt-10 receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-5 py-3 sm:px-7", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Tus cuentas" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45", children: "C\u00F3d. de invitaci\u00F3n" })] }), _jsx("ul", { className: "divide-y divide-ink/10", children: groups.map((g, i) => {
                        const isOwner = g.createdBy === currentUserId;
                        return (_jsx("li", { className: `group/row animate-print ${g.isSettled ? "bg-accent/[0.03]" : ""}`, style: { animationDelay: `${i * 60}ms` }, children: _jsxs("button", { type: "button", onClick: () => onOpen(g.id), className: "w-full text-left flex items-center gap-4 px-5 py-4 sm:px-7 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors", children: [_jsxs("span", { className: "font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0", children: [",", pad2(i + 1)] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-base sm:text-lg font-semibold tracking-[-0.01em] text-ink", children: g.name }), _jsxs("p", { className: "font-mono text-[10px] tracking-[0.14em] uppercase text-ink/45", children: [_jsx("span", { className: isOwner ? "text-accent" : "text-ink/45", children: isOwner ? "Tuya" : "Te uniste" }), _jsx("span", { "aria-hidden": true, className: "text-ink/30", children: " \u00B7 " }), "Abierta el ", formatCreatedAt(g.createdAt), g.isSettled && (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": true, className: "text-ink/30", children: " \u00B7 " }), _jsxs("span", { className: "text-accent font-medium inline-flex items-center gap-1", children: [_jsx(Check, { className: "size-3.5", strokeWidth: 2.5, "aria-hidden": true }), "Saldada"] })] }))] })] }), _jsxs("span", { onClick: (e) => {
                                            e.stopPropagation();
                                            onCopy(g);
                                        }, role: "button", tabIndex: 0, onKeyDown: (e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onCopy(g);
                                            }
                                        }, className: "group/code inline-flex items-center gap-1.5 rounded-sm px-2 py-1 -mx-2 hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40", "aria-label": `Copiar código de ${g.name}`, children: [_jsx("span", { className: "font-mono text-sm tracking-[0.08em] text-ink/80 group-hover/code:text-ink", children: formatInviteCode(g.inviteCode) }), copiedId === g.id ? (_jsx(Check, { className: "size-3.5 text-accent", strokeWidth: 2.5, "aria-hidden": true })) : (_jsx(Copy, { className: "size-3.5 text-ink/40 group-hover/code:text-ink/70", strokeWidth: 2, "aria-hidden": true }))] }), _jsx(ArrowRight, { className: "size-4 text-ink/30 transition-transform group-hover/row:translate-x-1", strokeWidth: 2, "aria-hidden": true })] }) }, g.id));
                    }) })] }) }));
}
function Stubs({ mode, onOpen, }) {
    return (_jsxs("section", { className: "mt-8 grid grid-cols-2 gap-3", children: [_jsx(Stub, { serial: "+ 001", label: "Crear cuenta", active: mode === "create", onClick: () => onOpen("create") }), _jsx(Stub, { serial: "\u2192 002", label: "Entrar con c\u00F3digo", active: mode === "join", onClick: () => onOpen("join") })] }));
}
function Stub({ serial, label, active, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, "aria-pressed": active, className: `group/stub text-left bg-card border border-ink/12 border-dashed px-4 py-4 sm:px-5 sm:py-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 ${active
            ? "border-ink/45 bg-card"
            : "hover:border-ink/30 hover:bg-card/80"}`, children: [_jsx("span", { className: `block font-mono text-[10px] tracking-[0.2em] uppercase ${active ? "text-accent" : "text-ink/55"}`, children: serial }), _jsx("span", { className: "mt-2 block text-sm sm:text-base font-semibold tracking-[-0.01em] text-ink", children: label })] }));
}
function CreateForm({ name, error, formError, submitting, onName, onSubmit, onCancel, }) {
    return (_jsx("div", { className: "receipt animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Nueva cuenta" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "+ 001" })] }), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "px-7 py-7 sm:px-9 sm:py-8 space-y-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]", children: "Abre una cuenta" }), _jsx("p", { className: "mt-2 text-sm text-ink/60", children: "Ponle un nombre. Luego podr\u00E1s invitar con un c\u00F3digo." })] }), formError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: formError })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "group-name", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block", children: "Nombre" }), _jsx("input", { id: "group-name", name: "name", type: "text", autoComplete: "off", maxLength: 80, value: name, onChange: (e) => onName(e.target.value), "aria-invalid": !!error, "aria-describedby": error ? "group-name-err" : undefined, placeholder: "Pisos de la calle Mayor", className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30" }), error && (_jsx("p", { id: "group-name-err", className: "font-mono text-[11px] text-accent", children: error }))] }), _jsxs("div", { className: "flex items-center gap-4 pt-1", children: [_jsxs("button", { type: "submit", disabled: submitting, className: "group/btn relative disabled:opacity-60 disabled:cursor-wait", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsx("span", { className: "relative block px-5 py-2.5 text-card font-semibold tracking-wide", children: submitting ? "Abriendo…" : "Abrir cuenta" })] }), _jsx("button", { type: "button", onClick: onCancel, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Cancelar" })] })] })] }) }));
}
function JoinForm({ value, error, formError, submitting, onChange, onSubmit, onCancel, }) {
    return (_jsx("div", { className: "receipt animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Unirse a una cuenta" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2192 002" })] }), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "px-7 py-7 sm:px-9 sm:py-8 space-y-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]", children: "Entra con el c\u00F3digo" }), _jsx("p", { className: "mt-2 text-sm text-ink/60", children: "P\u00E9galo tal cual te lo hayan pasado." })] }), formError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: formError })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "invite-code", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block", children: "C\u00F3digo de invitaci\u00F3n" }), _jsx("input", { id: "invite-code", name: "inviteCode", type: "text", autoComplete: "off", spellCheck: false, value: value, onChange: (e) => onChange(e.target.value), "aria-invalid": !!error, "aria-describedby": error ? "invite-code-err" : undefined, placeholder: "A3F9\u00B7C2D0", className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 font-mono text-base tracking-[0.08em] uppercase outline-none transition-colors placeholder:text-ink/30" }), error && (_jsx("p", { id: "invite-code-err", className: "font-mono text-[11px] text-accent", children: error }))] }), _jsxs("div", { className: "flex items-center gap-4 pt-1", children: [_jsxs("button", { type: "submit", disabled: submitting, className: "group/btn relative disabled:opacity-60 disabled:cursor-wait", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsx("span", { className: "relative block px-5 py-2.5 text-card font-semibold tracking-wide", children: submitting ? "Entrando…" : "Entrar" })] }), _jsx("button", { type: "button", onClick: onCancel, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Cancelar" })] })] })] }) }));
}
