import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function GroupErrorState({ kind, message, onBack, onRetry, }) {
    const title = kind === "notfound"
        ? "No existe esa cuenta."
        : kind === "forbidden"
            ? "No tienes acceso."
            : "No hemos podido abrirla.";
    return (_jsx("main", { className: "mt-10 sm:mt-12", children: _jsx("div", { className: "receipt", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Error" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "!" })] }), _jsxs("div", { className: "px-7 py-8 sm:px-9 space-y-4", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]", children: title }), _jsx("p", { className: "text-sm text-ink/65", children: message }), _jsxs("div", { className: "flex items-center gap-5 pt-1", children: [_jsx("button", { type: "button", onClick: onBack, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2", children: "Volver a tus cuentas" }), onRetry && (_jsx("button", { type: "button", onClick: onRetry, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1", children: "Reintentar" }))] })] })] }) }) }));
}
