import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInSchema, type SignInInput } from "@settleup/shared";
import { signIn } from "@/lib/auth";

type FieldErrors = Partial<Record<keyof SignInInput, string>>;

export function SignInPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignInInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    <K extends keyof SignInInput>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (formError) setFormError(null);
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignInInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      setFormError("El correo o la contraseña no son correctos.");
      return;
    }

    navigate("/");
  };

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
                Volver a entrar
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
                —
              </span>
            </div>

            <form
              onSubmit={onSubmit}
              noValidate
              className="px-7 py-8 sm:px-9 sm:py-10 space-y-6"
            >
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.05]">
                Entra
              </h1>

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
                  htmlFor="signin-email"
                  className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block"
                >
                  Correo
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={update("email")}
                  aria-invalid={!!errors.email}
                  className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors"
                />
                {errors.email && (
                  <p className="font-mono text-[11px] text-accent">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor="signin-password"
                    className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55"
                  >
                    Contraseña
                  </label>
                </div>
                <input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  value={values.password}
                  onChange={update("password")}
                  aria-invalid={!!errors.password}
                  className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors"
                />
                {errors.password && (
                  <p className="font-mono text-[11px] text-accent">
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full mt-2 disabled:opacity-60 disabled:cursor-wait"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-accent rounded-sm stamp origin-center"
                />
                <span className="relative block py-3.5 text-card font-semibold tracking-wide">
                  {submitting ? "Comprobando…" : "Entrar"}
                </span>
              </button>
            </form>

            <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
              <span>
                ¿Sin cuenta?{" "}
                <Link
                  to="/signup"
                  className="text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
                >
                  Crea una
                </Link>
              </span>
              <span className="font-mono tracking-wider">#002</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
