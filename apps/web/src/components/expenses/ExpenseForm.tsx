import { useId, useMemo, useState, type FormEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import { z } from "zod";
import type { GroupMember } from "@/services/members";
import type { CreateExpenseInput } from "@/services/expenses";
import { useCreateExpense } from "@/hooks/useCreateExpense";
import { ApiError } from "@/lib/api";
import { formatCents } from "@/lib/formatters";

type SplitMethod = "equal" | "exact" | "percentage";

type Draft = {
  description: string;
  amountInput: string; // texto: "12,50" → cents
  currency: string;
  paidBy: string;
  method: SplitMethod;
  // Por miembro: { selected: bool, exactCents: string, percentage: string }
  perMember: Record<
    string,
    { selected: boolean; exactCents: string; percentage: string }
  >;
};

const buildDraft = (
  members: GroupMember[],
  defaultPayerId: string,
): Draft => {
  const perMember: Draft["perMember"] = {};
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
const parseAmountToCents = (raw: string): number => {
  const cleaned = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
};

/**
 * Devuelve, para cada miembro, los céntimos que el backend asignará.
 * Implementa la misma regla que el backend: en `equal` y `percentage`,
 * el primero de la lista seleccionada se lleva el remanente para que
 * la suma cierre exactamente con el total.
 */
const computeFinalSplit = (
  method: SplitMethod,
  members: GroupMember[],
  perMember: Draft["perMember"],
  amountCents: number,
): Map<string, number> => {
  const result = new Map<string, number>();
  const selected = members.filter((m) => perMember[m.userId]?.selected);
  if (selected.length === 0 || !Number.isFinite(amountCents)) return result;

  if (method === "equal") {
    const n = selected.length;
    const base = Math.floor(amountCents / n);
    const remainder = amountCents - base * n;
    for (let i = 0; i < selected.length; i++) {
      result.set(
        selected[i]!.userId,
        base + (i === 0 ? remainder : 0),
      );
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
    const e = entries[i]!;
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
    .array(
      z.object({
        userId: z.string().min(1),
        amountCents: z
          .number()
          .int()
          .positive("Cada parte debe ser mayor que 0."),
      }),
    )
    .min(1, "Marca al menos a una persona."),
});

const createPercentageSchema = z.object({
  ...baseShape,
  splitMethod: z.literal("percentage"),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1),
        percentage: z
          .number()
          .positive("El porcentaje debe ser mayor que 0.")
          .max(100, "El porcentaje no puede pasar de 100."),
      }),
    )
    .min(1, "Marca al menos a una persona."),
});

// ---------- Componente público ----------

export function ExpenseForm({
  groupId,
  members,
  defaultPayerId,
  onClose,
  onCreated,
}: {
  groupId: string;
  members: GroupMember[];
  defaultPayerId: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    buildDraft(members, defaultPayerId),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const create = useCreateExpense(groupId);

  const amountCents = useMemo(
    () => parseAmountToCents(draft.amountInput),
    [draft.amountInput],
  );

  // Preview del reparto final (lo que el backend asignará)
  const finalSplit = useMemo(
    () =>
      computeFinalSplit(
        draft.method,
        members,
        draft.perMember,
        amountCents,
      ),
    [draft.method, draft.perMember, members, amountCents],
  );

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
        } else {
          sum += v;
        }
      }
      const matches = Number.isFinite(amountCents) && sum === amountCents;
      const diff = Number.isFinite(amountCents) ? amountCents - sum : 0;
      let message: string;
      if (matches) {
        message = "Cuadra";
      } else if (anyMissing && sum === 0) {
        message = "Faltan importes";
      } else if (diff > 0) {
        message = `Faltan ${formatCents(diff, draft.currency)} por asignar`;
      } else {
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
      } else {
        sum += n;
      }
    }
    const ok = Math.abs(sum - 100) < 0.0001;
    const diff = 100 - sum;
    let message: string;
    if (ok) {
      message = "Suma 100 %";
    } else if (anyMissing && sum === 0) {
      message = "Faltan %";
    } else if (diff > 0) {
      message = `Faltan ${diff.toFixed(2)} %`;
    } else {
      message = `Te pasas por ${(-diff).toFixed(2)} %`;
    }
    return { ok, sum, message, remainder: ok ? 0 : diff };
  }, [draft, members, amountCents]);

  const update = <K extends keyof Draft>(key: K) =>
    (value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleMember = (userId: string) =>
    setDraft((d) => ({
      ...d,
      perMember: {
        ...d.perMember,
        [userId]: { ...d.perMember[userId]!, selected: !d.perMember[userId]!.selected },
      },
    }));

  const setMemberExact = (userId: string, value: string) =>
    setDraft((d) => ({
      ...d,
      perMember: {
        ...d.perMember,
        [userId]: { ...d.perMember[userId]!, exactCents: value },
      },
    }));

  const setMemberPercentage = (userId: string, value: string) =>
    setDraft((d) => ({
      ...d,
      perMember: {
        ...d.perMember,
        [userId]: { ...d.perMember[userId]!, percentage: value },
      },
    }));

  // ---------- Auto-corrección ----------

  /**
   * En `exact`: reparte el remanente entre todos los seleccionados
   * de forma proporcional a lo que ya tienen. Si nadie tiene, lo
   * reparte a partes iguales y el remanente va al primero.
   */
  const distributeRemainderExact = () => {
    if (!Number.isFinite(amountCents)) return;
    const selected = members.filter(
      (m) => draft.perMember[m.userId]?.selected,
    );
    if (selected.length === 0) return;

    const current = selected.map((m) => ({
      userId: m.userId,
      cents: parseAmountToCents(
        draft.perMember[m.userId]?.exactCents ?? "",
      ),
    }));
    const known = current.filter((c) => Number.isFinite(c.cents) && c.cents > 0);
    const knownSum = known.reduce((s, c) => s + c.cents, 0);
    const diff = amountCents - knownSum;

    if (Math.abs(diff) < 1) return;

    let assigned = 0;
    const next: Record<string, string> = {};
    for (let i = 0; i < current.length; i++) {
      const { userId, cents } = current[i]!;
      if (cents > 0 && knownSum > 0 && known.length > 0) {
        const share = Math.floor((cents / knownSum) * diff);
        const newCents = cents + share;
        assigned += share;
        next[userId] = (newCents / 100).toFixed(2).replace(".", ",");
      }
    }
    // El primer seleccionado con importe conocido (o el primero de la lista)
    // se lleva el remanente para que la suma cierre exactamente.
    const sink =
      known[0]?.userId ?? current[0]?.userId ?? selected[0]!.userId;
    const sinkCents = parseAmountToCents(next[sink] ?? "0") + (diff - assigned);
    next[sink] = (sinkCents / 100).toFixed(2).replace(".", ",");

    setDraft((d) => {
      const perMember = { ...d.perMember };
      for (const [userId, value] of Object.entries(next)) {
        if (perMember[userId]) {
          perMember[userId] = { ...perMember[userId]!, exactCents: value };
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
    const selected = members.filter(
      (m) => draft.perMember[m.userId]?.selected,
    );
    if (selected.length === 0) return;
    setDraft((d) => {
      const perMember = { ...d.perMember };
      for (let i = 0; i < selected.length; i++) {
        const id = selected[i]!.userId;
        perMember[id] = {
          ...perMember[id]!,
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
    const selected = members.filter(
      (m) => draft.perMember[m.userId]?.selected,
    );
    const n = selected.length;
    if (n === 0) return;
    // Dos decimales es lo que el backend acepta (multipleOf 0.01).
    const base = Math.floor((100 / n) * 100) / 100;
    const remainder = +(100 - base * n).toFixed(2);
    setDraft((d) => {
      const perMember = { ...d.perMember };
      for (let i = 0; i < selected.length; i++) {
        const id = selected[i]!.userId;
        const pct = i === 0 ? +(base + remainder).toFixed(2) : base;
        perMember[id] = {
          ...perMember[id]!,
          percentage: pct.toFixed(2).replace(/\.?0+$/, "").replace(".", ","),
        };
      }
      return { ...d, perMember };
    });
  };

  const onSubmit = async (e: FormEvent) => {
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

    let payload: CreateExpenseInput;
    if (draft.method === "equal") {
      payload = {
        ...base,
        splitMethod: "equal",
        splits: selectedIds.map((userId) => ({ userId })),
      };
    } else if (draft.method === "exact") {
      payload = {
        ...base,
        splitMethod: "exact",
        splits: selectedIds.map((userId) => ({
          userId,
          amountCents: parseAmountToCents(draft.perMember[userId]?.exactCents ?? ""),
        })),
      };
    } else {
      payload = {
        ...base,
        splitMethod: "percentage",
        splits: selectedIds.map((userId) => ({
          userId,
          percentage: Number(
            (draft.perMember[userId]?.percentage ?? "").replace(",", "."),
          ),
        })),
      };
    }

    const schema =
      draft.method === "equal"
        ? createEqualSchema
        : draft.method === "exact"
          ? createExactSchema
          : createPercentageSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await create.mutateAsync(parsed.data as CreateExpenseInput);
      onCreated?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No hemos podido apuntar el gasto.");
      }
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="receipt animate-print max-h-[calc(100dvh-2rem)] overflow-y-auto"
      aria-label="Anotar gasto"
    >
      <div className="bg-card border-x border-ink/12">
        {/* Membrete del gasto */}
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Nuevo apunte
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              + 001
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="text-ink/45 hover:text-ink transition-colors"
            >
              <X className="size-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-7 py-7 sm:px-9 sm:py-8 space-y-7">
          {formError && (
            <p
              role="alert"
              className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
            >
              {formError}
            </p>
          )}

          {/* Banda 1: descripción, importe, pagador */}
          <div className="space-y-5">
            <DescriptionRow
              value={draft.description}
              onChange={(v) => update("description")(v)}
              error={errors.description}
            />

            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-end">
              <AmountRow
                value={draft.amountInput}
                onChange={(v) => update("amountInput")(v)}
                error={errors.amountCents}
                previewCents={amountCents}
                currency={draft.currency}
              />
              <ReceiptRow label="Moneda">
                <input
                  type="text"
                  value={draft.currency}
                  onChange={(e) => update("currency")(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-14 bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono text-center outline-none transition-colors uppercase"
                />
              </ReceiptRow>
            </div>

            <PaidByRow
              value={draft.paidBy}
              onChange={(v) => update("paidBy")(v)}
              members={members}
              error={errors.paidBy}
            />
          </div>

          {/* Banda 2: método de reparto */}
          <div className="space-y-3">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
              Reparto
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "equal", label: "Partes iguales" },
                  { id: "exact", label: "Montos exactos" },
                  { id: "percentage", label: "Porcentaje" },
                ] as const
              ).map((opt) => {
                const active = draft.method === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("method")(opt.id)}
                    aria-pressed={active}
                    className={`px-2 py-2 text-xs font-mono tracking-[0.06em] uppercase border rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 ${
                      active
                        ? "border-ink/60 bg-ink/[0.04] text-ink"
                        : "border-ink/15 border-dashed text-ink/55 hover:border-ink/30 hover:text-ink/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banda 3: desglose por miembro */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                Entre
              </p>
              <p
                className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                  breakdown.ok ? "text-ink/70" : "text-accent"
                }`}
                aria-live="polite"
              >
                {breakdown.ok ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                    {breakdown.message}
                  </span>
                ) : (
                  breakdown.message
                )}
              </p>
            </div>

            <ul className="border-y border-dashed border-ink/20 divide-y divide-ink/10">
              {members.map((m) => {
                const cell = draft.perMember[m.userId]!;
                const assigned = finalSplit.get(m.userId);
                return (
                  <li
                    key={m.userId}
                    className="flex items-center gap-3 px-1 py-2.5"
                  >
                    <label className="inline-flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cell.selected}
                        onChange={() => toggleMember(m.userId)}
                        className="size-4 accent-[var(--color-accent)]"
                      />
                      <span className="truncate text-sm">{m.name}</span>
                    </label>

                    {cell.selected && draft.method === "exact" && (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cell.exactCents}
                        onChange={(e) => setMemberExact(m.userId, e.target.value)}
                        placeholder="0,00"
                        aria-label={`Importe para ${m.name}`}
                        className="w-24 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30"
                      />
                    )}

                    {cell.selected && draft.method === "percentage" && (
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-16 flex items-center justify-end gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={cell.percentage}
                            onChange={(e) => setMemberPercentage(m.userId, e.target.value)}
                            placeholder="0"
                            aria-label={`Porcentaje para ${m.name}`}
                            className="w-12 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30"
                          />
                          <span className="font-mono text-xs text-ink/45">%</span>
                        </div>
                        <span
                          className="w-20 text-right font-mono text-xs text-ink/55 tabular-nums"
                          title="Importe calculado a este porcentaje"
                        >
                          {Number.isFinite(assigned ?? NaN)
                            ? formatCents(assigned as number, draft.currency)
                            : "—"}
                        </span>
                      </div>
                    )}

                    {draft.method === "equal" && (
                      <span className="w-20 text-right font-mono text-sm text-ink/85 tabular-nums">
                        {cell.selected && Number.isFinite(assigned ?? NaN)
                          ? formatCents(assigned as number, draft.currency)
                          : "—"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Banda Σ: suma en directo + acciones de auto-corrección */}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <div className="flex items-baseline gap-3">
                <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                  Σ
                </p>
                <p
                  className={`font-mono text-sm tabular-nums ${
                    breakdown.ok ? "text-ink" : "text-accent"
                  }`}
                >
                  {draft.method === "percentage"
                    ? `${breakdown.sum.toFixed(2)} %`
                    : formatCents(breakdown.sum, draft.currency)}
                </p>
                {draft.method !== "percentage" &&
                  Number.isFinite(amountCents) && (
                    <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
                      de {formatCents(amountCents, draft.currency)}
                    </p>
                  )}
                {draft.method === "percentage" && (
                  <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
                    de 100 %
                  </p>
                )}
              </div>

              {draft.method === "exact" && !breakdown.ok && (
                <button
                  type="button"
                  onClick={distributeRemainderExact}
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
                >
                  Repartir el resto
                </button>
              )}
              {draft.method === "percentage" && !breakdown.ok && (
                <button
                  type="button"
                  onClick={distributeEqualPercentage}
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
                >
                  A partes iguales
                </button>
              )}
            </div>

            {errors.splits && (
              <p className="font-mono text-[11px] text-accent">{errors.splits}</p>
            )}
          </div>

          {/* Banda 4: acciones */}
          <div className="flex items-center gap-5 pt-1">
            <button
              type="submit"
              disabled={
                create.isPending ||
                !breakdown.ok ||
                !draft.description.trim() ||
                !Number.isFinite(amountCents) ||
                amountCents <= 0 ||
                members.filter((m) => draft.perMember[m.userId]?.selected)
                  .length === 0
              }
              className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                !breakdown.ok
                  ? "El reparto no cuadra con el importe."
                  : !draft.description.trim()
                    ? "Escribe una descripción."
                    : !Number.isFinite(amountCents) || amountCents <= 0
                      ? "Introduce un importe válido."
                      : undefined
              }
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
              />
              <span className="relative inline-flex items-center gap-1.5 px-5 py-2.5 text-card font-semibold tracking-wide">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                {create.isPending
                  ? "Anotando…"
                  : !breakdown.ok
                    ? "Sin cuadrar"
                    : "Anotar gasto"}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
          <span>El recibo se sella al confirmar.</span>
          <span className="font-mono tracking-wider">#EXP</span>
        </div>
      </div>
    </form>
  );
}

function countSelected(draft: Draft, members: GroupMember[]): number {
  return members.filter((m) => draft.perMember[m.userId]?.selected).length;
}

function ReceiptRow({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block"
      >
        {label}
      </label>
      {children}
      {error && <p className="font-mono text-[11px] text-accent">{error}</p>}
    </div>
  );
}

/**
 * Sub-componentes por fila del form. Cada uno genera un id único con
 * `useId()` y lo pasa al label (`htmlFor`) y al control (`id`). Esto
 * es lo que faltaba en el `ReceiptRow` original: el label era
 * `<label>` de bloque sin asociación con el control, lo que rompe
 * la accesibilidad y los tests con Testing Library.
 */

function DescriptionRow({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <ReceiptRow label="Descripción" error={error} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
        placeholder="Cena del viernes"
        aria-invalid={!!error}
        className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30"
      />
    </ReceiptRow>
  );
}

function AmountRow({
  value,
  onChange,
  error,
  previewCents,
  currency,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  previewCents: number;
  currency: string;
}) {
  const id = useId();
  return (
    <>
      <ReceiptRow label="Importe" error={error} htmlFor={id}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          aria-invalid={!!error}
          className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono tracking-tight outline-none transition-colors placeholder:text-ink/30"
        />
      </ReceiptRow>
      <div className="w-20 text-right font-mono text-sm text-ink/45 pb-2 tabular-nums">
        {formatCents(previewCents, currency)}
      </div>
    </>
  );
}

function PaidByRow({
  value,
  onChange,
  members,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  members: GroupMember[];
  error?: string;
}) {
  const id = useId();
  return (
    <ReceiptRow label="Pagado por" error={error} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors appearance-none"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>
    </ReceiptRow>
  );
}
