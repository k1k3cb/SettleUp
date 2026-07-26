import { useMemo, useState, type FormEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import { z } from "zod";
import type { GroupMember } from "@/services/members";
import type { CreateExpenseInput } from "@/services/expenses";
import { useCreateExpense } from "@/hooks/useCreateExpense";
import { ApiError } from "@/lib/api";

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

const formatCents = (cents: number, currency: string): string => {
  if (!Number.isFinite(cents)) return "—";
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = (abs % 100).toString().padStart(2, "0");
  const symbol = currency === "EUR" ? "€" : currency;
  return `${sign}${major},${minor} ${symbol}`;
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

  // Cálculos en vivo del desglose según método
  const breakdown = useMemo(() => {
    const selectedIds = members
      .filter((m) => draft.perMember[m.userId]?.selected)
      .map((m) => m.userId);

    if (draft.method === "equal") {
      const n = selectedIds.length;
      if (n === 0 || !Number.isFinite(amountCents)) {
        return { ok: false, sum: 0, message: "—" };
      }
      const base = Math.floor(amountCents / n);
      const remainder = amountCents - base * n;
      return {
        ok: true,
        sum: amountCents,
        message: `${n} personas a partes iguales`,
      };
    }

    if (draft.method === "exact") {
      let sum = 0;
      for (const id of selectedIds) {
        const v = parseAmountToCents(draft.perMember[id]?.exactCents ?? "");
        if (!Number.isFinite(v)) return { ok: false, sum: 0, message: "Faltan importes" };
        sum += v;
      }
      const matches = Number.isFinite(amountCents) && sum === amountCents;
      return {
        ok: matches,
        sum,
        message: matches ? "Cuadra" : `Faltan ${formatCents(amountCents - sum, draft.currency)}`,
      };
    }

    // percentage
    let sum = 0;
    for (const id of selectedIds) {
      const raw = (draft.perMember[id]?.percentage ?? "").replace(",", ".");
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return { ok: false, sum: 0, message: "Faltan %" };
      sum += n;
    }
    const ok = Math.abs(sum - 100) < 0.0001;
    return {
      ok,
      sum,
      message: ok ? "Suma 100 %" : `Suma ${sum.toFixed(2)} %`,
    };
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
      className="receipt animate-print"
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
            <ReceiptRow
              label="Descripción"
              error={errors.description}
            >
              <input
                type="text"
                value={draft.description}
                onChange={(e) => update("description")(e.target.value)}
                maxLength={120}
                placeholder="Cena del viernes"
                aria-invalid={!!errors.description}
                className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30"
              />
            </ReceiptRow>

            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-end">
              <ReceiptRow label="Importe" error={errors.amountCents}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.amountInput}
                  onChange={(e) => update("amountInput")(e.target.value)}
                  placeholder="0,00"
                  aria-invalid={!!errors.amountCents}
                  className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono tracking-tight outline-none transition-colors placeholder:text-ink/30"
                />
              </ReceiptRow>
              <ReceiptRow label="Moneda">
                <input
                  type="text"
                  value={draft.currency}
                  onChange={(e) => update("currency")(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-14 bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base font-mono text-center outline-none transition-colors uppercase"
                />
              </ReceiptRow>
              <div className="w-20 text-right font-mono text-sm text-ink/45 pb-2 tabular-nums">
                {formatCents(amountCents, draft.currency)}
              </div>
            </div>

            <ReceiptRow label="Pagado por" error={errors.paidBy}>
              <select
                value={draft.paidBy}
                onChange={(e) => update("paidBy")(e.target.value)}
                aria-invalid={!!errors.paidBy}
                className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors appearance-none"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </ReceiptRow>
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
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                Entre
              </p>
              <p
                className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                  breakdown.ok ? "text-ink/70" : "text-accent"
                }`}
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
                        className="w-24 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30"
                      />
                    )}

                    {cell.selected && draft.method === "percentage" && (
                      <div className="w-24 flex items-center justify-end gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={cell.percentage}
                          onChange={(e) => setMemberPercentage(m.userId, e.target.value)}
                          placeholder="0"
                          className="w-16 bg-transparent border-b border-ink/25 focus:border-ink py-1 text-right text-sm font-mono tabular-nums outline-none transition-colors placeholder:text-ink/30"
                        />
                        <span className="font-mono text-xs text-ink/45">%</span>
                      </div>
                    )}

                    {draft.method === "equal" && (
                      <span className="w-24 text-right font-mono text-xs text-ink/45 tabular-nums">
                        {cell.selected && amountCents > 0
                          ? formatCents(
                              Math.floor(amountCents / Math.max(1, countSelected(draft, members))),
                              draft.currency,
                            )
                          : "—"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {errors.splits && (
              <p className="font-mono text-[11px] text-accent">{errors.splits}</p>
            )}
          </div>

          {/* Banda 4: acciones */}
          <div className="flex items-center gap-5 pt-1">
            <button
              type="submit"
              disabled={create.isPending || !breakdown.ok}
              className="group relative disabled:opacity-60 disabled:cursor-wait"
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
              />
              <span className="relative inline-flex items-center gap-1.5 px-5 py-2.5 text-card font-semibold tracking-wide">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                {create.isPending ? "Anotando…" : "Anotar gasto"}
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block">
        {label}
      </label>
      {children}
      {error && <p className="font-mono text-[11px] text-accent">{error}</p>}
    </div>
  );
}
