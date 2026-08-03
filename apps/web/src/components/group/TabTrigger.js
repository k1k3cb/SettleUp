import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TabsTrigger } from "@/components/ui/tabs";
/**
 * Trigger de pestaña con el chrome del cuaderno: mono, uppercase,
 * sin fondo, sin bordes redondeados, con un contador a la derecha
 * separado por `·`. El subrayado del activo viene del `variant="line"`
 * del `TabsList` (regla `after:opacity-100` cuando el trigger está
 * activo) — aquí solo aportamos color y peso.
 */
export function TabTrigger({ value, label, count, }) {
    return (_jsxs(TabsTrigger, { value: value, className: "rounded-none bg-transparent font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink data-active:text-ink data-active:font-medium px-3 py-2.5 h-auto data-active:bg-transparent data-active:shadow-none", children: [label, _jsx("span", { "aria-hidden": true, className: "text-ink/30", children: " \u00B7 " }), _jsx("span", { className: "tabular-nums", children: count === null ? "—" : count.toString().padStart(2, "0") })] }));
}
