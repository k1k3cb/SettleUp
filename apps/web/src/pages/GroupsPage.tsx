import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { groupsService } from "@/services/groups";
import type { Group } from "@/types/group";
import { ApiError } from "@/lib/api";
import { formatShortDateWithYear, pad2 } from "@/lib/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "idle" | "create" | "join";

type FieldErrors = Partial<Record<"name" | "inviteCode", string>>;

const formatInviteCode = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
};

// Alias con el nombre histórico de esta página.
const formatCreatedAt = formatShortDateWithYear;

export function GroupsPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "settled">(
    "pending",
  );

  useEffect(() => {
    if (isPending) return;
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
      if (!hasPending) setActiveTab("settled");
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No hemos podido cargar tus cuentas.",
      );
    }
  };

  const openMode = (next: Mode) => {
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

  const onCreate = async (e: FormEvent) => {
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
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No hemos podido crear la cuenta.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onJoin = async (e: FormEvent) => {
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
        if (!prev) return [joined];
        if (prev.some((g) => g.id === joined.id)) return prev;
        return [joined, ...prev];
      });
      setMode("idle");
      setInvite("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setFormError("Ese código no corresponde a ninguna cuenta.");
        } else if (err.status === 409) {
          setFormError("Ya formas parte de esa cuenta.");
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("No hemos podido entrar en la cuenta.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = async (g: Group) => {
    try {
      await navigator.clipboard.writeText(g.inviteCode);
      setCopiedId(g.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === g.id ? null : current));
      }, 1600);
    } catch {
      /* clipboard no disponible: no rompemos la UI */
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45">
          Comprobando…
        </span>
      </div>
    );
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
  const heroLabel =
    totalGroups === 0
      ? "sin cuentas"
      : pending.length === 0
        ? "al día"
        : pending.length === 1
          ? "pendiente por cuadrar"
          : "pendientes por cuadrar";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-16 sm:pb-24">
        <PageHeader
          userName={session.user.name}
          onSignOut={async () => {
            await signOut();
            navigate("/signin", { replace: true });
          }}
        />

        <Hero
          count={pending.length}
          label={heroLabel}
          settledCount={settledCount}
          totalGroups={totalGroups}
        />

        {groups === null ? (
          <List
            groups={groups}
            loadError={loadError}
            onRetry={load}
            copiedId={copiedId}
            onCopy={onCopy}
            onOpen={(id) => navigate(`/groups/${id}`)}
            currentUserId={session.user.id}
          />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex flex-col gap-4"
          >
            <TabsList
              variant="line"
              className="bg-transparent border-b border-ink/15 rounded-none p-0 h-auto justify-start gap-1 text-ink/55"
            >
              <GroupsTab
                value="pending"
                label="Pendientes"
                count={pendingCount}
                isActive={activeTab === "pending"}
              />
              <GroupsTab
                value="settled"
                label="Saldados"
                count={settledCount}
                isActive={activeTab === "settled"}
              />
            </TabsList>

            <TabsContent value="pending" className="mt-0 focus-visible:outline-none">
              {pending.length === 0 ? (
                <EmptyState
                  title="Al día."
                  hint="No hay cuentas pendientes. Si abres una nueva, aparecerá aquí."
                />
              ) : (
                <List
                  groups={pending}
                  loadError={null}
                  onRetry={load}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  onOpen={(id) => navigate(`/groups/${id}`)}
                  currentUserId={session.user.id}
                />
              )}
            </TabsContent>

            <TabsContent value="settled" className="mt-0 focus-visible:outline-none">
              {settled.length === 0 ? (
                <EmptyState
                  title="Sin liquidar todavía."
                  hint="Cuando se cierre la primera cuenta, quedará sellada aquí."
                />
              ) : (
                <List
                  groups={settled}
                  loadError={null}
                  onRetry={load}
                  copiedId={copiedId}
                  onCopy={onCopy}
                  onOpen={(id) => navigate(`/groups/${id}`)}
                  currentUserId={session.user.id}
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        <Stubs
          mode={mode}
          onOpen={openMode}
        />

        {mode !== "idle" && (
          <div className="mt-6">
            {mode === "create" ? (
              <CreateForm
                name={name}
                error={errors.name}
                formError={formError}
                submitting={submitting}
                onName={setName}
                onSubmit={onCreate}
                onCancel={cancel}
              />
            ) : (
              <JoinForm
                value={invite}
                error={errors.inviteCode}
                formError={formError}
                submitting={submitting}
                onChange={setInvite}
                onSubmit={onJoin}
                onCancel={cancel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
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
function GroupsTab({
  value,
  label,
  count,
  isActive: _isActive,
}: {
  value: "pending" | "settled";
  label: string;
  count: string;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none bg-transparent font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink data-active:text-ink data-active:font-medium px-3 py-2.5 h-auto data-active:bg-transparent data-active:shadow-none"
    >
      {label}
      <span aria-hidden className="text-ink/30"> · </span>
      <span className="tabular-nums">{count}</span>
    </TabsTrigger>
  );
}

function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <article className="receipt">
      <div className="bg-card border-x border-ink/12 px-7 py-6 sm:px-9">
        <p className="text-sm text-ink/80">{title}</p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
          {hint}
        </p>
      </div>
    </article>
  );
}

function PageHeader({
  userName,
  onSignOut,
}: {
  userName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-baseline justify-between">
      <Link
        to="/"
        className="group inline-flex items-baseline gap-1.5 font-mono text-xs tracking-[0.22em] uppercase text-ink/70 hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm"
        aria-label="Volver al inicio"
      >
        SettleUp
        <span aria-hidden className="text-ink/35">·</span>
        <span className="text-ink/55 group-hover:text-ink transition-colors">
          Cuentas
        </span>
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors"
      >
        Salir
      </button>
      <span className="sr-only">Sesión de {userName}</span>
    </header>
  );
}

function Hero({
  count,
  label,
  settledCount,
  totalGroups,
}: {
  count: number;
  label: string;
  settledCount: string;
  totalGroups: number;
}) {
  // El número grande es lo que requiere acción. El sub-label
  // secundario da el contexto del cuaderno entero sin robarle
  // protagonismo a la cifra principal. Si no hay cuentas en
  // absoluto, no mostramos el sub-label: solo "sin cuentas".
  const showSettledSubLabel = totalGroups > 0;
  return (
    <section className="mt-10 sm:mt-14">
      <div className="flex items-end gap-4 leading-none">
        <span
          aria-hidden
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45 pb-3"
        >
          Nº
        </span>
        <span
          className="stamp origin-bottom-left text-[120px] sm:text-[152px] font-semibold tracking-[-0.04em] leading-[0.85] text-ink"
        >
          {pad2(count)}
        </span>
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-[0.18em] uppercase text-ink/55">
        {label}
      </p>
      {showSettledSubLabel && (
        <p className="mt-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/35">
          {settledCount} saldadas · {totalGroups} en total
        </p>
      )}
    </section>
  );
}

function List({
  groups,
  loadError,
  onRetry,
  copiedId,
  onCopy,
  onOpen,
  currentUserId,
}: {
  groups: Group[] | null;
  loadError: string | null;
  onRetry: () => void;
  copiedId: string | null;
  onCopy: (g: Group) => void;
  onOpen: (id: string) => void;
  currentUserId: string;
}) {
  if (loadError) {
    return (
      <section className="mt-10">
        <p className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1">
          {loadError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (groups === null) {
    return (
      <section className="mt-10 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 border-y border-dashed border-ink/10 bg-card/40"
          />
        ))}
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="mt-10 receipt">
        <div className="bg-card border-x border-ink/12 px-7 py-6 sm:px-9">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Vacío
          </p>
          <p className="mt-2 text-base text-ink/80">
            Aún no tienes cuentas. Abre la primera abajo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 receipt">
      <div className="bg-card border-x border-ink/12">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3 sm:px-7">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Tus cuentas
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45">
            Cód. de invitación
          </span>
        </div>

        <ul className="divide-y divide-ink/10">
          {groups.map((g, i) => {
            const isOwner = g.createdBy === currentUserId;
            return (
            <li
              key={g.id}
              className={`group/row animate-print ${g.isSettled ? "bg-accent/[0.03]" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <button
                type="button"
                onClick={() => onOpen(g.id)}
                className="w-full text-left flex items-center gap-4 px-5 py-4 sm:px-7 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors"
              >
                <span className="font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0">
                  ,{pad2(i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base sm:text-lg font-semibold tracking-[-0.01em] text-ink">
                    {g.name}
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink/45">
                    <span className={isOwner ? "text-accent" : "text-ink/45"}>
                      {isOwner ? "Tuya" : "Te uniste"}
                    </span>
                    <span aria-hidden className="text-ink/30"> · </span>
                    Abierta el {formatCreatedAt(g.createdAt)}
                    {g.isSettled && (
                      <>
                        <span aria-hidden className="text-ink/30"> · </span>
                        <span className="text-accent font-medium inline-flex items-center gap-1">
                          <Check
                            className="size-3.5"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          Saldada
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(g);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onCopy(g);
                    }
                  }}
                  className="group/code inline-flex items-center gap-1.5 rounded-sm px-2 py-1 -mx-2 hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40"
                  aria-label={`Copiar código de ${g.name}`}
                >
                  <span className="font-mono text-sm tracking-[0.08em] text-ink/80 group-hover/code:text-ink">
                    {formatInviteCode(g.inviteCode)}
                  </span>
                  {copiedId === g.id ? (
                    <Check
                      className="size-3.5 text-accent"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : (
                    <Copy
                      className="size-3.5 text-ink/40 group-hover/code:text-ink/70"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </span>
                <ArrowRight
                  className="size-4 text-ink/30 transition-transform group-hover/row:translate-x-1"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Stubs({
  mode,
  onOpen,
}: {
  mode: Mode;
  onOpen: (m: Mode) => void;
}) {
  return (
    <section className="mt-8 grid grid-cols-2 gap-3">
      <Stub
        serial="+ 001"
        label="Crear cuenta"
        active={mode === "create"}
        onClick={() => onOpen("create")}
      />
      <Stub
        serial="→ 002"
        label="Entrar con código"
        active={mode === "join"}
        onClick={() => onOpen("join")}
      />
    </section>
  );
}

function Stub({
  serial,
  label,
  active,
  onClick,
}: {
  serial: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group/stub text-left bg-card border border-ink/12 border-dashed px-4 py-4 sm:px-5 sm:py-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 ${
        active
          ? "border-ink/45 bg-card"
          : "hover:border-ink/30 hover:bg-card/80"
      }`}
    >
      <span
        className={`block font-mono text-[10px] tracking-[0.2em] uppercase ${
          active ? "text-accent" : "text-ink/55"
        }`}
      >
        {serial}
      </span>
      <span className="mt-2 block text-sm sm:text-base font-semibold tracking-[-0.01em] text-ink">
        {label}
      </span>
    </button>
  );
}

function CreateForm({
  name,
  error,
  formError,
  submitting,
  onName,
  onSubmit,
  onCancel,
}: {
  name: string;
  error?: string;
  formError: string | null;
  submitting: boolean;
  onName: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="receipt animate-print">
      <div className="bg-card border-x border-ink/12">
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Nueva cuenta
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            + 001
          </span>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="px-7 py-7 sm:px-9 sm:py-8 space-y-5"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
              Abre una cuenta
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              Ponle un nombre. Luego podrás invitar con un código.
            </p>
          </div>

          {formError && (
            <p
              role="alert"
              className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
            >
              {formError}
            </p>
          )}

          <div className="space-y-2">
            <label
              htmlFor="group-name"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block"
            >
              Nombre
            </label>
            <input
              id="group-name"
              name="name"
              type="text"
              autoComplete="off"
              maxLength={80}
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onName(e.target.value)
              }
              aria-invalid={!!error}
              aria-describedby={error ? "group-name-err" : undefined}
              placeholder="Pisos de la calle Mayor"
              className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30"
            />
            {error && (
              <p
                id="group-name-err"
                className="font-mono text-[11px] text-accent"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="group/btn relative disabled:opacity-60 disabled:cursor-wait"
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
              />
              <span className="relative block px-5 py-2.5 text-card font-semibold tracking-wide">
                {submitting ? "Abriendo…" : "Abrir cuenta"}
              </span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinForm({
  value,
  error,
  formError,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  error?: string;
  formError: string | null;
  submitting: boolean;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div className="receipt animate-print">
      <div className="bg-card border-x border-ink/12">
        <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            Unirse a una cuenta
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
            → 002
          </span>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="px-7 py-7 sm:px-9 sm:py-8 space-y-5"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
              Entra con el código
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              Pégalo tal cual te lo hayan pasado.
            </p>
          </div>

          {formError && (
            <p
              role="alert"
              className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
            >
              {formError}
            </p>
          )}

          <div className="space-y-2">
            <label
              htmlFor="invite-code"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block"
            >
              Código de invitación
            </label>
            <input
              id="invite-code"
              name="inviteCode"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              aria-invalid={!!error}
              aria-describedby={error ? "invite-code-err" : undefined}
              placeholder="A3F9·C2D0"
              className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 font-mono text-base tracking-[0.08em] uppercase outline-none transition-colors placeholder:text-ink/30"
            />
            {error && (
              <p
                id="invite-code-err"
                className="font-mono text-[11px] text-accent"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="group/btn relative disabled:opacity-60 disabled:cursor-wait"
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
              />
              <span className="relative block px-5 py-2.5 text-card font-semibold tracking-wide">
                {submitting ? "Entrando…" : "Entrar"}
              </span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
