import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Sello "Invita" en la cabecera del grupo, junto al nombre. Muestra
 * "Invita" por defecto y "¡Listo!" brevemente al pulsar (controlado
 * por el padre). El padre también maneja el copy al portapapeles.
 */
export function InviteStamp({ copied, onClick, }) {
    return (_jsx("button", { type: "button", onClick: onClick, "aria-label": "Copiar c\u00F3digo de invitaci\u00F3n", className: "stamp relative -mt-1 shrink-0 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm", children: _jsx("div", { className: "border-[1.5px] border-accent rounded-[3px] px-3 py-1.5 rotate-[-6deg]", children: _jsx("span", { className: "block font-mono text-[11px] tracking-[0.28em] uppercase text-accent leading-none", children: copied ? "¡Listo!" : "Invita" }) }) }));
}
/**
 * Sello "Liquidado" que aparece en la cabecera del grupo cuando
 * `balances.isSettled === true`. Es informativo (no accionable),
 * por eso es un <span>, no un botón. Color ink/70 (no accent) para
 * diferenciar de los sellos de eventos: "liquidado" es un estado
 * estable, no una acción.
 */
export function SettledStamp() {
    return (_jsx("span", { "aria-label": "Cuenta liquidada", className: "stamp relative inline-block mt-3 select-none", children: _jsx("span", { className: "inline-block border-[1.5px] border-ink/40 rounded-[3px] px-2.5 py-1 rotate-[3deg]", children: _jsx("span", { className: "block font-mono text-[10px] tracking-[0.26em] uppercase text-ink/70 leading-none", children: "Liquidado" }) }) }));
}
