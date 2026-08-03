import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Users } from "lucide-react";
import { signOut, useSession } from "@/lib/auth";
const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
});
export function HomePage() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();
    if (isPending) {
        return (_jsx("div", { className: "min-h-screen bg-paper flex items-center justify-center", children: _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45", children: "Comprobando\u2026" }) }));
    }
    if (!session) {
        return (_jsx(SignedOut, {}));
    }
    return (_jsx(SignedIn, { userName: session.user.name, onOpenGroups: () => navigate("/groups"), onSignOut: async () => {
            await signOut();
            navigate("/signin", { replace: true });
        } }));
}
function SignedOut() {
    return (_jsxs("div", { className: "min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-10 sm:py-16", children: [_jsxs("header", { className: "text-center", children: [_jsx("div", { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/70", children: "SettleUp" }), _jsx("p", { className: "mt-2 text-sm text-ink/55 max-w-xs", children: "Cuentas claras entre quienes comparten gastos." })] }), _jsx("main", { className: "w-full max-w-sm mt-12 sm:mt-20", children: _jsx("div", { className: "receipt relative animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Portada" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2014" })] }), _jsxs("div", { className: "px-7 py-10 sm:px-9 sm:py-12 space-y-6 text-center", children: [_jsxs("h1", { className: "text-4xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.02]", children: ["Cuadra las cuentas", _jsx("br", {}), _jsx("span", { className: "text-ink/55", children: "sin discutir." })] }), _jsx("p", { className: "text-sm text-ink/65 max-w-xs mx-auto", children: "Una libreta compartida para cada grupo: cenas, pisos, viajes. Qui\u00E9n pag\u00F3, qui\u00E9n debe, y a qui\u00E9n hay que devolverle." }), _jsxs("div", { className: "flex items-center justify-center gap-6 pt-2", children: [_jsxs("button", { onClick: () => window.location.assign("/signup"), className: "group relative", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsx("span", { className: "relative block px-5 py-2.5 text-card font-semibold tracking-wide", children: "Empezar" })] }), _jsx("button", { onClick: () => window.location.assign("/signin"), className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Ya tengo cuenta" })] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "Sin p\u00E9rdidas. Sin hojas sueltas." }), _jsx("span", { className: "font-mono tracking-wider", children: "#000" })] })] }) }) })] }));
}
function SignedIn({ userName, onOpenGroups, onSignOut, }) {
    return (_jsx("div", { className: "min-h-screen bg-paper text-ink", children: _jsxs("div", { className: "mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-14 sm:pb-24", children: [_jsx(Header, { userName: userName, onSignOut: onSignOut }), _jsx(Notebook, { userName: userName, onOpenGroups: onOpenGroups })] }) }));
}
function Header({ userName, onSignOut, }) {
    return (_jsxs("header", { className: "flex items-baseline justify-between", children: [_jsx("div", { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/70", children: "SettleUp" }), _jsx("button", { type: "button", onClick: onSignOut, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors", children: "Salir" }), _jsxs("span", { className: "sr-only", children: ["Sesi\u00F3n de ", userName] })] }));
}
function Notebook({ userName, onOpenGroups, }) {
    return (_jsx("main", { className: "mt-10 sm:mt-12", children: _jsx("div", { className: "receipt relative animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-ink/10 px-7 pt-7 pb-5 sm:px-9", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/55", children: ["Est. ", today] }), _jsx("p", { className: "mt-2 font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Titular" }), _jsx("p", { className: "mt-1 text-base text-ink", children: userName })] }), _jsx(OpenStamp, {})] }), _jsxs("div", { className: "px-7 pt-9 pb-2 sm:px-9", children: [_jsxs("h1", { className: "text-[42px] sm:text-[52px] font-semibold tracking-[-0.035em] leading-[0.95] text-ink", children: ["Cuadra", _jsx("br", {}), _jsx("span", { className: "text-ink/55", children: "las cuentas." })] }), _jsx("p", { className: "mt-5 text-sm text-ink/65 max-w-xs", children: "Una libreta por grupo. Anotas qui\u00E9n pag\u00F3, ves qui\u00E9n debe, y liquidas lo que haga falta en un par de toques." })] }), _jsxs("div", { className: "px-7 pt-8 pb-2 sm:px-9 space-y-2", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Empezar" }), _jsx("ul", { className: "border-y border-dashed border-ink/20 divide-y divide-ink/10", children: _jsx(Row, { serial: ",01", label: "Cuentas", hint: "Tus grupos: cena, piso, viaje\u2026", icon: _jsx(Users, { className: "size-4", strokeWidth: 2, "aria-hidden": true }), onClick: onOpenGroups }) })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "Abrir la primera cuenta es empezar." }), _jsx("span", { className: "font-mono tracking-wider", children: "#000" })] })] }) }) }));
}
function Row({ serial, label, hint, icon, onClick, disabled = false, }) {
    const base = "group/row flex items-center gap-4 px-2 py-3.5 -mx-2 transition-colors";
    const interactive = disabled
        ? "cursor-not-allowed"
        : "hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] cursor-pointer";
    const inner = (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0", children: serial }), _jsx("span", { className: "text-ink/55 group-hover/row:text-ink/70 transition-colors", children: icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: `text-base font-semibold tracking-[-0.01em] ${disabled ? "text-ink/45" : "text-ink"}`, children: label }), _jsx("p", { className: `font-mono text-[10px] tracking-[0.12em] uppercase ${disabled ? "text-ink/35" : "text-ink/45"}`, children: hint })] }), _jsx(ArrowUpRight, { className: `size-4 transition-transform ${disabled
                    ? "text-ink/25"
                    : "text-ink/40 group-hover/row:text-ink group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5"}`, strokeWidth: 2, "aria-hidden": true })] }));
    if (disabled) {
        return (_jsx("li", { "aria-disabled": true, className: `${base} ${interactive}`, children: inner }));
    }
    return (_jsx("li", { children: _jsx("button", { type: "button", onClick: onClick, className: `${base} ${interactive} w-full text-left rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40`, children: inner }) }));
}
function OpenStamp() {
    return (_jsx("div", { "aria-hidden": true, className: "stamp relative -mt-1 shrink-0 select-none", children: _jsx("div", { className: "border-[1.5px] border-accent rounded-[3px] px-3 py-1.5 rotate-[-6deg]", children: _jsx("span", { className: "block font-mono text-[11px] tracking-[0.28em] uppercase text-accent leading-none", children: "Abierto" }) }) }));
}
