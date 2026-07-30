import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Users } from "lucide-react";
import { signOut, useSession } from "@/lib/auth";

const today = new Date().toLocaleDateString("es-ES", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function HomePage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45">
          Comprobando…
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <SignedOut />
    );
  }

  return (
    <SignedIn
      userName={session.user.name}
      onOpenGroups={() => navigate("/groups")}
      onSignOut={async () => {
        await signOut();
        navigate("/signin", { replace: true });
      }}
    />
  );
}

function SignedOut() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-10 sm:py-16">
      <header className="text-center">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-ink/70">
          SettleUp
        </div>
        <p className="mt-2 text-sm text-ink/55 max-w-xs">
          Cuentas claras entre quienes comparten gastos.
        </p>
      </header>

      <main className="w-full max-w-sm mt-12 sm:mt-20">
        <div className="receipt relative animate-print">
          <div className="bg-card border-x border-ink/12">
            <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
                Portada
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
                —
              </span>
            </div>

            <div className="px-7 py-10 sm:px-9 sm:py-12 space-y-6 text-center">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.02]">
                Cuadra las cuentas
                <br />
                <span className="text-ink/55">sin discutir.</span>
              </h1>
              <p className="text-sm text-ink/65 max-w-xs mx-auto">
                Una libreta compartida para cada grupo: cenas, pisos, viajes.
                Quién pagó, quién debe, y a quién hay que devolverle.
              </p>

              <div className="flex items-center justify-center gap-6 pt-2">
                <button
                  onClick={() => window.location.assign("/signup")}
                  className="group relative"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
                  />
                  <span className="relative block px-5 py-2.5 text-card font-semibold tracking-wide">
                    Empezar
                  </span>
                </button>
                <button
                  onClick={() => window.location.assign("/signin")}
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 hover:text-ink underline underline-offset-4 decoration-1"
                >
                  Ya tengo cuenta
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
              <span>Sin pérdidas. Sin hojas sueltas.</span>
              <span className="font-mono tracking-wider">#000</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SignedIn({
  userName,
  onOpenGroups,
  onSignOut,
}: {
  userName: string;
  onOpenGroups: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Header userName={userName} onSignOut={onSignOut} />

        <Notebook
          userName={userName}
          onOpenGroups={onOpenGroups}
        />
      </div>
    </div>
  );
}

function Header({
  userName,
  onSignOut,
}: {
  userName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="flex items-baseline justify-between">
      <div className="font-mono text-xs tracking-[0.22em] uppercase text-ink/70">
        SettleUp
      </div>
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

function Notebook({
  userName,
  onOpenGroups,
}: {
  userName: string;
  onOpenGroups: () => void;
}) {
  return (
    <main className="mt-10 sm:mt-12">
      <div className="receipt relative animate-print">
        <div className="bg-card border-x border-ink/12">
          {/* Membrete del cuaderno */}
          <div className="flex items-start justify-between border-b border-ink/10 px-7 pt-7 pb-5 sm:px-9">
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/55">
                Est. {today}
              </p>
              <p className="mt-2 font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
                Titular
              </p>
              <p className="mt-1 text-base text-ink">{userName}</p>
            </div>
            <OpenStamp />
          </div>

          {/* Declaración: el "qué" del producto */}
          <div className="px-7 pt-9 pb-2 sm:px-9">
            <h1 className="text-[42px] sm:text-[52px] font-semibold tracking-[-0.035em] leading-[0.95] text-ink">
              Cuadra
              <br />
              <span className="text-ink/55">las cuentas.</span>
            </h1>
            <p className="mt-5 text-sm text-ink/65 max-w-xs">
              Una libreta por grupo. Anotas quién pagó, ves quién debe, y
              liquidas lo que haga falta en un par de toques.
            </p>
          </div>

          {/* Una sola acción: abrir las cuentas. Las dos filas deshabilitadas
              que había aquí (Gastos, Saldos) eran ruido: la home no es un
              menú, es una portada. Las que sí tienen trabajo viven dentro
              de cada cuenta. */}
          <div className="px-7 pt-8 pb-2 sm:px-9 space-y-2">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
              Empezar
            </p>
            <ul className="border-y border-dashed border-ink/20 divide-y divide-ink/10">
              <Row
                serial=",01"
                label="Cuentas"
                hint="Tus grupos: cena, piso, viaje…"
                icon={<Users className="size-4" strokeWidth={2} aria-hidden />}
                onClick={onOpenGroups}
              />
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>Abrir la primera cuenta es empezar.</span>
            <span className="font-mono tracking-wider">#000</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({
  serial,
  label,
  hint,
  icon,
  onClick,
  disabled = false,
}: {
  serial: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "group/row flex items-center gap-4 px-2 py-3.5 -mx-2 transition-colors";
  const interactive = disabled
    ? "cursor-not-allowed"
    : "hover:bg-ink/[0.03] focus-visible:bg-ink/[0.03] cursor-pointer";

  const inner = (
    <>
      <span className="font-mono text-[11px] tracking-[0.12em] text-ink/45 w-8 shrink-0">
        {serial}
      </span>
      <span className="text-ink/55 group-hover/row:text-ink/70 transition-colors">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-base font-semibold tracking-[-0.01em] ${
            disabled ? "text-ink/45" : "text-ink"
          }`}
        >
          {label}
        </p>
        <p
          className={`font-mono text-[10px] tracking-[0.12em] uppercase ${
            disabled ? "text-ink/35" : "text-ink/45"
          }`}
        >
          {hint}
        </p>
      </div>
      <ArrowUpRight
        className={`size-4 transition-transform ${
          disabled
            ? "text-ink/25"
            : "text-ink/40 group-hover/row:text-ink group-hover/row:translate-x-0.5 group-hover/row:-translate-y-0.5"
        }`}
        strokeWidth={2}
        aria-hidden
      />
    </>
  );

  if (disabled) {
    return (
      <li aria-disabled className={`${base} ${interactive}`}>
        {inner}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`${base} ${interactive} w-full text-left rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40`}
      >
        {inner}
      </button>
    </li>
  );
}

function OpenStamp() {
  return (
    <div
      aria-hidden
      className="stamp relative -mt-1 shrink-0 select-none"
    >
      <div className="border-[1.5px] border-accent rounded-[3px] px-3 py-1.5 rotate-[-6deg]">
        <span className="block font-mono text-[11px] tracking-[0.28em] uppercase text-accent leading-none">
          Abierto
        </span>
      </div>
    </div>
  );
}
