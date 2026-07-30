import { Eye } from "lucide-react";
import type { ExpenseWithSplits } from "@/services/expenses";
import type { GroupMember } from "@/services/members";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCents, formatLongDateTime } from "@/lib/formatters";

type SplitMethod = ExpenseWithSplits["splitMethod"];

const methodLabel: Record<SplitMethod, string> = {
  equal: "Partes iguales",
  exact: "Montos exactos",
  percentage: "Porcentaje",
};

export function ExpenseDetailsSheet({
  expense,
  members,
  payerName,
  open,
  onOpenChange,
}: {
  expense: ExpenseWithSplits | null;
  members: GroupMember[];
  payerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="bg-paper border-l border-ink/15 shadow-none p-0 gap-0 sm:max-w-md"
      >
        {expense ? (
          <Detail
            expense={expense}
            members={members}
            payerName={payerName}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
        <SheetTitle className="sr-only">
          Detalle del apunte
        </SheetTitle>
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  expense,
  members,
  payerName,
  onClose,
}: {
  expense: ExpenseWithSplits;
  members: GroupMember[];
  payerName: string;
  onClose: () => void;
}) {
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

  return (
    <article
      className="receipt animate-print flex flex-col h-full overflow-y-auto"
      aria-label="Detalle del apunte"
    >
      <div className="bg-card border-x border-ink/12 flex-1">
        {/* Membrete */}
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            <Eye className="size-3" strokeWidth={2.25} aria-hidden />
            Apunte
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              · 001
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="px-7 py-7 sm:px-9 sm:py-8 space-y-7">
          <header>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
              {expense.description}
            </h2>
            <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
              {formatLongDateTime(expense.createdAt)}
            </p>
          </header>

          {/* Banda 1: importe y pagador */}
          <dl className="space-y-5">
            <Row label="Importe">
              <span className="font-mono text-base tabular-nums text-ink">
                {formatCents(expense.amountCents, expense.currency)}
              </span>
            </Row>
            <Row label="Pagado por">
              <span className="text-base text-ink">{payerName}</span>
            </Row>
            <Row label="Reparto">
              <span className="text-base text-ink">
                {methodLabel[expense.splitMethod]}
              </span>
            </Row>
          </dl>

          {/* Banda 2: desglose */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                Entre
              </p>
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
                {rows.length} {rows.length === 1 ? "persona" : "personas"}
              </p>
            </div>

            <ul className="border-y border-dashed border-ink/20 divide-y divide-ink/10">
              {rows.map((r) => (
                <li
                  key={r.userId}
                  className="flex items-center gap-3 px-1 py-2.5"
                >
                  <span className="flex-1 min-w-0 truncate text-sm">
                    {r.name}
                  </span>
                  {r.pct !== null && (
                    <span className="font-mono text-xs tabular-nums text-ink/55 w-14 text-right">
                      {r.pct.toFixed(2).replace(/\.?0+$/, "")} %
                    </span>
                  )}
                  <span className="font-mono text-sm tabular-nums text-ink w-24 text-right">
                    {formatCents(r.cents, expense.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between pt-1">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                Σ
              </p>
              <p className="font-mono text-sm tabular-nums text-ink">
                {formatCents(
                  rows.reduce((s, r) => s + r.cents, 0),
                  expense.currency,
                )}
              </p>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
          <span>Solo lectura. Para rectificar, anula y anota de nuevo.</span>
          <span className="font-mono tracking-wider">#EXP</span>
        </div>
      </div>
    </article>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
