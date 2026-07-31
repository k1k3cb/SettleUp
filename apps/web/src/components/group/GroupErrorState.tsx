export type GroupErrorKind = "load" | "notfound" | "forbidden";

export function GroupErrorState({
  kind,
  message,
  onBack,
  onRetry,
}: {
  kind: GroupErrorKind;
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
