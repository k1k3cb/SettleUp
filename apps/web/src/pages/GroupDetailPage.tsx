import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useSession, signOut } from "@/lib/auth";
import { groupsService, type GroupDetail } from "@/services/groups";
import { ApiError } from "@/lib/api";

const formatInviteCode = (raw: string) => {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
};

const formatCreatedAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<{ kind: "load" | "notfound" | "forbidden"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      navigate("/signin", { replace: true });
      return;
    }
    if (!id) {
      setError({ kind: "notfound", message: "Falta el identificador del grupo." });
      return;
    }
    void load(id);
  }, [id, isPending, session, navigate]);

  const load = async (groupId: string) => {
    setError(null);
    setGroup(null);
    try {
      const data = await groupsService.get(groupId);
      setGroup(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError({ kind: "notfound", message: "No existe esa cuenta." });
        } else if (err.status === 403) {
          setError({
            kind: "forbidden",
            message: "No formas parte de esta cuenta.",
          });
        } else {
          setError({ kind: "load", message: err.message });
        }
      } else {
        setError({
          kind: "load",
          message: "No hemos podido abrir la cuenta.",
        });
      }
    }
  };

  const onCopy = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard no disponible */
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Header
          onBack={() => navigate("/groups")}
          onSignOut={async () => {
            await signOut();
            navigate("/signin", { replace: true });
          }}
        />

        {error ? (
          <ErrorState
            kind={error.kind}
            message={error.message}
            onBack={() => navigate("/groups")}
            onRetry={id ? () => load(id) : undefined}
          />
        ) : group ? (
          <Notebook
            group={group}
            currentUserId={session.user.id}
            copied={copied}
            onCopy={onCopy}
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </div>
  );
}

function Header({
  onBack,
  onSignOut,
}: {
  onBack: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-baseline justify-between">
      <Link
        to="/groups"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        className="group inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink transition-colors"
      >
        <ArrowLeft
          className="size-3 transition-transform group-hover:-translate-x-0.5"
          strokeWidth={2.25}
          aria-hidden
        />
        Cuentas
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors"
      >
        Salir
      </button>
    </header>
  );
}

function Notebook({
  group,
  currentUserId,
  copied,
  onCopy,
}: {
  group: GroupDetail;
  currentUserId: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const isOwner = group.createdBy === currentUserId;

  return (
    <main className="mt-10 sm:mt-12 space-y-6">
      <article className="receipt relative animate-print">
        <div className="bg-card border-x border-ink/12">
          {/* Membrete: nombre del grupo a la izquierda, sello "invita" a la derecha */}
          <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-7 pt-7 pb-6 sm:px-9">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/55">
                Cuenta
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.02] text-ink">
                {group.name}
              </h1>
              <p className="mt-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45">
                Abierta el {formatCreatedAt(group.createdAt)}
              </p>
            </div>
            <InviteStamp copied={copied} onClick={onCopy} />
          </div>

          {/* Bloque de invitación: la acción real que la API soporta hoy */}
          <div className="px-7 pt-6 pb-2 sm:px-9">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
              Invitación
            </p>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copiar código de invitación"
              className="mt-3 w-full flex items-center justify-between gap-3 border border-ink/15 border-dashed px-4 py-3 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 transition-colors rounded-sm"
            >
              <span className="font-mono text-base tracking-[0.1em] text-ink/85">
                {formatInviteCode(group.inviteCode)}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55">
                {copied ? (
                  <>
                    Copiado
                    <Check className="size-3.5 text-accent" strokeWidth={2.5} aria-hidden />
                  </>
                ) : (
                  <>
                    Copiar
                    <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                  </>
                )}
              </span>
            </button>
            <p className="mt-3 text-xs text-ink/55">
              Comparte este código para que alguien se una a la cuenta.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>
              {isOwner ? "Eres quien abrió esta cuenta." : "Te uniste a esta cuenta."}
            </span>
            <span className="font-mono tracking-wider">
              #{group.id.slice(0, 3).toUpperCase()}
            </span>
          </div>
        </div>
      </article>

      {/* Secciones reales: por ahora solo cabecera. Las otras tres,
          honestamente, todavía no tienen endpoint. */}
      <Sections />
    </main>
  );
}

function InviteStamp({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copiar código de invitación"
      className="stamp relative -mt-1 shrink-0 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm"
    >
      <div className="border-[1.5px] border-accent rounded-[3px] px-3 py-1.5 rotate-[-6deg]">
        <span className="block font-mono text-[11px] tracking-[0.28em] uppercase text-accent leading-none">
          {copied ? "¡Listo!" : "Invita"}
        </span>
      </div>
    </button>
  );
}

function Sections() {
  return (
    <section aria-label="Secciones de la cuenta" className="space-y-3">
      <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45 px-1">
        Apartados
      </p>

      <ul className="border-y border-dashed border-ink/20 divide-y divide-ink/10 bg-card border-x border-ink/12">
        <DisabledRow serial=",01" label="Miembros" hint="Pendiente — sin endpoint." />
        <DisabledRow serial=",02" label="Gastos" hint="Pendiente — sin endpoint." />
        <DisabledRow serial=",03" label="Saldos" hint="Pendiente — sin endpoint." />
      </ul>

      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink/40 px-1 pt-1">
        Llegarán cuando el backend los exponga.
      </p>
    </section>
  );
}

function DisabledRow({
  serial,
  label,
  hint,
}: {
  serial: string;
  label: string;
  hint: string;
}) {
  return (
    <li
      aria-disabled
      className="flex items-center gap-4 px-5 py-4 sm:px-7 cursor-not-allowed"
    >
      <span className="font-mono text-[11px] tracking-[0.12em] text-ink/35 w-8 shrink-0">
        {serial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold tracking-[-0.01em] text-ink/45">
          {label}
        </p>
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/35">
          {hint}
        </p>
      </div>
      <span
        aria-hidden
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/35"
      >
        —
      </span>
    </li>
  );
}

function Skeleton() {
  return (
    <div className="mt-10 sm:mt-12 receipt">
      <div className="bg-card border-x border-ink/12 px-7 py-7 sm:px-9 space-y-5">
        <div className="h-3 w-20 bg-ink/10" />
        <div className="h-9 w-3/4 bg-ink/10" />
        <div className="h-3 w-1/2 bg-ink/10" />
        <div className="h-14 w-full bg-ink/5 mt-6" />
        <div className="h-3 w-2/3 bg-ink/5" />
      </div>
    </div>
  );
}

function ErrorState({
  kind,
  message,
  onBack,
  onRetry,
}: {
  kind: "load" | "notfound" | "forbidden";
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const title =
    kind === "notfound"
      ? "No existe esa cuenta."
      : kind === "forbidden"
        ? "No tienes acceso."
        : "No hemos podido abrirla.";

  return (
    <main className="mt-10 sm:mt-12">
      <div className="receipt">
        <div className="bg-card border-x border-ink/12">
          <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              Error
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
              !
            </span>
          </div>
          <div className="px-7 py-8 sm:px-9 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] leading-[1.05]">
              {title}
            </h1>
            <p className="text-sm text-ink/65">{message}</p>
            <div className="flex items-center gap-5 pt-1">
              <button
                type="button"
                onClick={onBack}
                className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
              >
                Volver a tus cuentas
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
                >
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
