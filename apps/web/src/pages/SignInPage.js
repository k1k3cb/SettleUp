import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { signInSchema } from "@settleup/shared";
import { signIn } from "@/lib/auth";
export function SignInPage() {
    const navigate = useNavigate();
    const [values, setValues] = useState({
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const update = (field) => (e) => {
        setValues((v) => ({ ...v, [field]: e.target.value }));
        if (errors[field])
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        if (formError)
            setFormError(null);
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        const parsed = signInSchema.safeParse(values);
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
    return (_jsxs("div", { className: "min-h-screen bg-paper text-ink flex flex-col items-center px-4 py-10 sm:py-16", children: [_jsxs("header", { className: "text-center", children: [_jsx("div", { className: "font-mono text-xs tracking-[0.22em] uppercase text-ink/70", children: "SettleUp" }), _jsx("p", { className: "mt-2 text-sm text-ink/55 max-w-xs", children: "Cuentas claras entre quienes comparten gastos." })] }), _jsx("main", { className: "w-full max-w-sm mt-12 sm:mt-20", children: _jsx("div", { className: "receipt relative animate-print", children: _jsxs("div", { className: "bg-card border-x border-ink/12", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-ink/10 px-7 py-3 sm:px-9", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "Volver a entrar" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/55", children: "\u2014" })] }), _jsxs("form", { onSubmit: onSubmit, noValidate: true, className: "px-7 py-8 sm:px-9 sm:py-10 space-y-6", children: [_jsx("h1", { className: "text-3xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.05]", children: "Entra" }), formError && (_jsx("p", { role: "alert", className: "font-mono text-xs text-accent border-l-2 border-accent pl-3 py-1", children: formError })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "signin-email", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55 block", children: "Correo" }), _jsx("input", { id: "signin-email", type: "email", autoComplete: "email", value: values.email, onChange: update("email"), "aria-invalid": !!errors.email, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors" }), errors.email && (_jsx("p", { className: "font-mono text-[11px] text-accent", children: errors.email }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("label", { htmlFor: "signin-password", className: "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/55", children: "Contrase\u00F1a" }), _jsxs("button", { type: "button", onClick: () => setPasswordVisible((v) => !v), "aria-label": passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña", "aria-pressed": passwordVisible, className: "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink/45 hover:text-ink transition-colors", children: [passwordVisible ? "Ocultar" : "Mostrar", passwordVisible ? (_jsx(EyeOff, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true })) : (_jsx(Eye, { className: "size-3.5", strokeWidth: 2, "aria-hidden": true }))] })] }), _jsx("input", { id: "signin-password", type: passwordVisible ? "text" : "password", autoComplete: "current-password", value: values.password, onChange: update("password"), "aria-invalid": !!errors.password, className: "w-full bg-transparent border-b border-ink/25 focus:border-ink py-1.5 text-base outline-none transition-colors" }), errors.password && (_jsx("p", { className: "font-mono text-[11px] text-accent", children: errors.password }))] }), _jsxs("button", { type: "submit", disabled: submitting, className: "group relative w-full mt-2 disabled:opacity-60 disabled:cursor-wait", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 bg-accent rounded-sm stamp origin-center" }), _jsx("span", { className: "relative block py-3.5 text-card font-semibold tracking-wide", children: submitting ? "Comprobando…" : "Entrar" })] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55", children: [_jsxs("span", { children: ["\u00BFSin cuenta?", " ", _jsx(Link, { to: "/signup", className: "text-accent underline underline-offset-4 decoration-1 hover:decoration-2", children: "Crea una" })] }), _jsx("span", { className: "font-mono tracking-wider", children: "#002" })] })] }) }) })] }));
}
