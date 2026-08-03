import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { formatLongDate } from "@/lib/formatters";
import { SignersSkeleton } from "./GroupSkeleton";
export function SignersSection({ group, currentUserId, members, membersLoading, membersError, onCountChange, }) {
    // El padre necesita saber el número de firmantes para mostrar el
    // contador en la tab. El callback va en un ref y el useEffect solo
    // depende del valor (`members`) para no causar bucle infinito si el
    // padre pasa el callback inline.
    const onCountChangeRef = useRef(onCountChange);
    useEffect(() => {
        onCountChangeRef.current = onCountChange;
    });
    useEffect(() => {
        onCountChangeRef.current?.(members ? members.length : null);
    }, [members]);
    return (_jsxs("section", { "aria-label": "Firmantes de la cuenta", className: "space-y-3", children: [_jsxs("div", { className: "flex items-baseline justify-between px-1", children: [_jsx("p", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45", children: "Firmantes" }), _jsx("p", { className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40", children: members
                            ? `${members.length} ${members.length === 1 ? "persona" : "personas"}`
                            : "—" })] }), _jsx("article", { className: "receipt relative", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [membersError ? (_jsx("div", { className: "px-7 py-6 sm:px-9", children: _jsxs("p", { className: "text-sm text-ink/65", children: [membersError, " ", _jsx("span", { className: "text-ink/40", children: "\u2014 puedes seguir mirando la cuenta." })] }) })) : membersLoading || members === null ? (_jsx(SignersSkeleton, { count: 2 })) : members.length === 0 ? (_jsx("div", { className: "px-7 py-6 sm:px-9", children: _jsx("p", { className: "text-sm text-ink/55", children: "Nadie ha firmado todav\u00EDa." }) })) : (_jsx("ul", { className: "divide-y divide-ink/10", children: members.map((m) => (_jsx(SignerRow, { name: m.name, joinedAt: m.joinedAt, isCurrent: m.userId === currentUserId, isOwner: m.userId === group.createdBy }, m.userId))) })), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: "Cada firma entra en el cuaderno." }), _jsx("span", { className: "font-mono tracking-wider", children: "#firmas" })] })] }) })] }));
}
function SignerRow({ name, joinedAt, isCurrent, isOwner, }) {
    return (_jsxs("li", { className: "px-7 py-4 sm:px-9 flex items-center gap-4", children: [_jsx("span", { "aria-hidden": true, className: "font-mono text-ink/30 text-lg leading-none -mt-0.5 select-none", children: "\u00B7" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-base font-semibold tracking-[-0.01em] text-ink truncate", children: name }), _jsxs("p", { className: "mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45", children: ["desde el ", formatLongDate(joinedAt)] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [isCurrent && !isOwner && _jsx(YouChip, {}), isOwner && _jsx(OwnerStamp, { isYou: isCurrent })] })] }));
}
function YouChip() {
    return (_jsx("span", { className: "font-mono text-[10px] tracking-[0.22em] uppercase text-ink/65 border-b border-ink/30 pb-0.5", children: "T\u00FA" }));
}
function OwnerStamp({ isYou }) {
    return (_jsx("span", { "aria-hidden": true, className: "stamp relative select-none", children: _jsx("span", { className: "inline-block border-[1.5px] border-accent rounded-[3px] px-2.5 py-1 rotate-[-6deg]", children: _jsx("span", { className: "block font-mono text-[10px] tracking-[0.26em] uppercase text-accent leading-none", children: isYou ? "Tú · abriste" : "Abierto por" }) }) }));
}
