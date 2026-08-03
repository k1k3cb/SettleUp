import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { signUpSchema } from "@settleup/shared";
import { signUp } from "@/lib/auth";
export function SignUpPage() {
    const navigate = useNavigate();
    const [values, setValues] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const update = (field) => (e) => {
        setValues((v) => ({ ...v, [field]: e.target.value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        if (formError)
            setFormError(null);
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        const parsed = signUpSchema.safeParse(values);
        if (!parsed.success) {
            const fieldErrors = {};
            for (const issue of parsed.error.issues) {
                const key = issue.path[0];
                if (!fieldErrors[key])
                    fieldErrors[key] = issue.message;
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
            setFormError(error.message?.includes("already")
                ? "Ese correo ya está en uso. Prueba a entrar."
                : "No hemos podido crear la cuenta. Inténtalo de nuevo.");
            return;
        }
        navigate("/");
    };
    return (_jsxs("div", { className: "min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-10 sm:py-16", children: [_jsx(Header, {}), _jsx("main", { className: "w-full max-w-sm mt-12 sm:mt-20", children: _jsxs(ReceiptStripe, { children: [_jsx(ReceiptHeader, { label: "Nuevo recibo" }), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "px-7 py-8 sm:px-9 sm:py-10 space-y-7", children: [_jsx("h1", { className: "text-3xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.05]", children: "Crea una cuenta" }), _jsx("p", { className: "text-sm text-ink/60 -mt-4", children: "Tarda menos que apuntar a mano qui\u00E9n pag\u00F3 la cena." }), formError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: formError })), _jsx(Field, { label: "Tu nombre", name: "name", autoComplete: "name", value: values.name, onChange: update("name"), error: errors.name }), _jsx(Field, { label: "Correo", name: "email", type: "email", autoComplete: "email", value: values.email, onChange: update("email"), error: errors.email }), _jsx(PasswordField, { value: values.password, onChange: update("password"), error: errors.password }), _jsx(SubmitButton, { submitting: submitting, children: "Crear cuenta" })] }), _jsx(ReceiptFooter, { left: _jsxs("span", { children: ["\u00BFYa tienes cuenta?", " ", _jsx(Link, { to: "/signin", className: "text-accent underline underline-offset-4 decoration-1 hover:decoration-2", children: "Entra" })] }), right: _jsx("span", { children: "#001" }) })] }) })] }));
}
function Header() {
    return (_jsxs("header", { className: "text-center", children: [_jsx("div", { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/70", children: "SettleUp" }), _jsx("p", { className: "mt-2 text-sm text-ink/55 max-w-xs", children: "Cuentas claras entre quienes comparten gastos." })] }));
}
function ReceiptStripe({ children }) {
    return (_jsx("div", { className: "receipt relative animate-print", children: _jsx("div", { className: "bg-card border-x border-ink/12 px-0", children: children }) }));
}
function ReceiptHeader({ label }) {
    return (_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: label }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2014" })] }));
}
function ReceiptFooter({ left, right, }) {
    return (_jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsx("span", { children: left }), _jsx("span", { className: "font-mono tracking-wider", children: right })] }));
}
function Field({ label, name, type = "text", autoComplete, value, onChange, error, }) {
    const id = `field-${name}`;
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: id, className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block", children: label }), _jsx("input", { id: id, name: name, type: type, autoComplete: autoComplete, value: value, onChange: onChange, "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : undefined, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30" }), error && (_jsx("p", { id: `${id}-err`, className: "font-mono text-[11px] text-accent", children: error }))] }));
}
function PasswordField({ value, onChange, error, }) {
    const [visible, setVisible] = useState(false);
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("label", { htmlFor: "field-password", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "Contrase\u00F1a" }), _jsxs("button", { type: "button", onClick: () => setVisible((v) => !v), "aria-label": visible ? "Ocultar contraseña" : "Mostrar contraseña", "aria-pressed": visible, className: "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors", children: [visible ? "Ocultar" : "Mostrar", visible ? (_jsx(EyeOff, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true })) : (_jsx(Eye, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true }))] })] }), _jsx("input", { id: "field-password", name: "password", type: visible ? "text" : "password", autoComplete: "new-password", value: value, onChange: onChange, "aria-invalid": !!error, "aria-describedby": error ? "field-password-err" : undefined, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors placeholder:text-ink/30" }), error && (_jsx("p", { id: "field-password-err", className: "font-mono text-[11px] text-accent", children: error }))] }));
}
function SubmitButton({ submitting, children, }) {
    return (_jsxs("button", { type: "submit", disabled: submitting, className: "group relative w-full mt-2 disabled:opacity-60 disabled:cursor-wait", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsx("span", { className: "relative block py-3.5 text-card font-semibold tracking-wide", children: submitting ? "Imprimiendo…" : children })] }));
}
