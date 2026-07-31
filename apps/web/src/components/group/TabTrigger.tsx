import { TabsTrigger } from "@/components/ui/tabs";

/**
 * Trigger de pestaña con el chrome del cuaderno: mono, uppercase,
 * sin fondo, sin bordes redondeados, con un contador a la derecha
 * separado por `·`. El subrayado del activo viene del `variant="line"`
 * del `TabsList` (regla `after:opacity-100` cuando el trigger está
 * activo) — aquí solo aportamos color y peso.
 */
export function TabTrigger({
  value,
  label,
  count,
}: {
  value: "signers" | "expenses" | "balances";
  label: string;
  count: number | null;
}) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none bg-transparent font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink data-active:text-ink data-active:font-medium px-3 py-2.5 h-auto data-active:bg-transparent data-active:shadow-none"
    >
      {label}
      <span aria-hidden className="text-ink/30"> · </span>
      <span className="tabular-nums">
        {count === null ? "—" : count.toString().padStart(2, "0")}
      </span>
    </TabsTrigger>
  );
}
