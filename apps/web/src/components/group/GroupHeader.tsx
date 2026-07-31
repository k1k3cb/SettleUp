import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function GroupHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex items-baseline justify-between">
      <nav
        aria-label="Migas"
        className="flex items-baseline gap-2 font-mono text-[10px] tracking-[0.18em] uppercase"
      >
        <Link
          to="/"
          className="text-ink/70 hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink/40 rounded-sm"
        >
          SettleUp
        </Link>
        <span aria-hidden className="text-ink/30">/</span>
        <Link
          to="/groups"
          className="group inline-flex items-center gap-1.5 text-ink/55 hover:text-ink transition-colors"
        >
          <ArrowLeft
            className="size-3 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
          Cuentas
        </Link>
      </nav>
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
