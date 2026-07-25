import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpInput } from "@settleup/shared";
import { signUp } from "@/lib/auth";

type FieldErrors = Partial<Record<keyof SignUpInput, string>>;

export function SignUpPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignUpInput>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    <K extends keyof SignUpInput>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (formError) setFormError(null);
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignUpInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      setFormError(
        error.message?.includes("already")
          ? "Ese correo ya está en uso. Prueba a entrar."
          : "No hemos podido crear la cuenta. Inténtalo de nuevo.",
      );
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-10 sm:py-16">
      <Header />

      <main className="w-full max-w-sm mt-12 sm:mt-20">
        <ReceiptStripe>
          <ReceiptHeader label="Nuevo recibo" />

          <form onSubmit={onSubmit} noValidate className="px-7 py-8 sm:px-9 sm:py-10 space-y-7">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.05]">
              Crea una cuenta
            </h1>
            <p className="text-sm text-ink/60 -mt-4">
              Tarda menos que apuntar a mano quién pagó la cena.
            </p>

            {formError && (
              <p
                role="alert"
                className="font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1"
              >
                {formError}
              </p>
            )}

            <Field
              label="Tu nombre"
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={update("name")}
              error={errors.name}
            />
            <Field
              label="Correo"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={update("email")}
              error={errors.email}
            />
            <PasswordField
              value={values.password}
              onChange={update("password")}
              error={errors.password}
            />

            <SubmitButton submitting={submitting}>Crear cuenta</SubmitButton>
          </form>

          <ReceiptFooter
            left={
              <span>
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/signin"
                  className="text-accent underline underline-offset-4 decoration-1 hover:decoration-2"
                >
                  Entra
                </Link>
              </span>
            }
            right={<span>#001</span>}
          />
        </ReceiptStripe>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="text-center">
      <div className="font-mono text-xs tracking-[0.22em] uppercase text-ink/70">
        SettleUp
      </div>
      <p className="mt-2 text-sm text-ink/55 max-w-xs">
        Cuentas claras entre quienes comparten gastos.
      </p>
    </header>
  );
}

function ReceiptStripe({ children }: { children: React.ReactNode }) {
  return (
    <div className="receipt relative animate-print">
      <div className="bg-card border-x border-ink/12 px-0">
        {children}
      </div>
    </div>
  );
}

function ReceiptHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9">
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
        {label}
      </span>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55">
        —
      </span>
    </div>
  );
}

function ReceiptFooter({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
      <span>{left}</span>
      <span className="font-mono tracking-wider">{right}</span>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
};

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  value,
  onChange,
  error,
}: FieldProps) {
  const id = `field-${name}`;
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30"
      />
      {error && (
        <p
          id={`${id}-err`}
          className="font-mono text-[11px] text-accent"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor="field-password"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55"
        >
          Contraseña
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <input
        id="field-password"
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? "field-password-err" : undefined}
        className="w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30"
      />
      {error && (
        <p
          id="field-password-err"
          className="font-mono text-[11px] text-accent"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({
  submitting,
  children,
}: {
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
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
        {submitting ? "Imprimiendo…" : children}
      </span>
    </button>
  );
}
