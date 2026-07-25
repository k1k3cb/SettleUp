import { useNavigate } from "react-router-dom";
import { signOut, useSession } from "@/lib/auth";

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
      <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-ink/70">
          SettleUp
        </div>
        <p className="mt-3 text-sm text-ink/55">No has iniciado sesión.</p>
        <button
          onClick={() => navigate("/signin")}
          className="mt-8 font-mono text-xs tracking-[0.18em] uppercase text-accent underline underline-offset-4"
        >
          Entrar →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4">
      <div className="font-mono text-xs tracking-[0.22em] uppercase text-ink/70">
        SettleUp
      </div>
      <p className="mt-3 text-sm text-ink/55">
        Hola, {session.user.name}. Aquí empezaremos a cuadrar las cuentas.
      </p>
      <button
        onClick={async () => {
          await signOut();
          navigate("/signin");
        }}
        className="mt-8 font-mono text-xs tracking-[0.18em] uppercase text-ink/55 hover:text-ink"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
