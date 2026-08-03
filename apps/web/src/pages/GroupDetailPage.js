import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth";
import { groupsService } from "@/services/groups";
import { ApiError } from "@/lib/api";
import { GroupHeader } from "@/components/group/GroupHeader";
import { Notebook } from "@/components/group/Notebook";
import { GroupErrorState, } from "@/components/group/GroupErrorState";
import { GroupSkeleton } from "@/components/group/GroupSkeleton";
/**
 * Página de detalle de un grupo. Es la capa de orquestación: carga
 * el grupo desde el backend, gestiona el estado de UI (modal de
 * gastos, tab activa, contadores, copy al portapapeles) y compone
 * los componentes de `components/group/*`. El cuaderno en sí
 * (membrete, sello, tabs, secciones de firmantes/apuntes/saldos)
 * vive en `Notebook` y sus hijos.
 *
 * La página solo se ocupa de:
 *   - Autenticación y redirección a /signin si no hay sesión.
 *   - Fetch del grupo + manejo de errores 404/403.
 *   - Estado de UI compartido entre secciones (modal de gastos,
 *     tab activa, copy al portapapeles, contadores de tabs).
 *
 * Todo lo demás — el cuaderno, los apartados, los formularios —
 * está en `components/group/*` y `components/{expenses,balances}/*`.
 */
export function GroupDetailPage() {
    const { id } = useParams();
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [expenseFormOpen, setExpenseFormOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("signers");
    const [counts, setCounts] = useState({ signers: null, expenses: null, balances: null });
    // useCallback con [] para que la referencia sea estable. Si se
    // creara inline en cada render, los useEffect de los hijos que
    // dependen de onCountChange se dispararían en bucle infinito.
    const handleCountChange = useCallback((key, n) => {
        setCounts((prev) => ({ ...prev, [key]: n }));
    }, []);
    useEffect(() => {
        if (isPending)
            return;
        if (!session) {
            navigate("/signin", { replace: true });
            return;
        }
        if (!id) {
            setError({
                kind: "notfound",
                message: "Falta el identificador del grupo.",
            });
            return;
        }
        void load(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isPending, session, navigate]);
    const load = async (groupId) => {
        setError(null);
        setGroup(null);
        try {
            const data = await groupsService.get(groupId);
            setGroup(data);
        }
        catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 404) {
                    setError({ kind: "notfound", message: "No existe esa cuenta." });
                }
                else if (err.status === 403) {
                    setError({
                        kind: "forbidden",
                        message: "No formas parte de esta cuenta.",
                    });
                }
                else {
                    setError({ kind: "load", message: err.message });
                }
            }
            else {
                setError({
                    kind: "load",
                    message: "No hemos podido abrir la cuenta.",
                });
            }
        }
    };
    const onCopy = async () => {
        if (!group)
            return;
        try {
            await navigator.clipboard.writeText(group.inviteCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        }
        catch {
            /* clipboard no disponible */
        }
    };
    if (isPending || !session) {
        return (_jsx("div", { className: "min-h-screen bg-paper flex items-center justify-center", children: _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] uppercase text-ink/45", children: "Comprobando\u2026" }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-paper text-ink", children: _jsxs("div", { className: "mx-auto max-w-md px-5 pt-10 pb-16 sm:pt-14 sm:pb-24", children: [_jsx(GroupHeader, { onSignOut: async () => {
                        await signOut();
                        navigate("/signin", { replace: true });
                    } }), error ? (_jsx(GroupErrorState, { kind: error.kind, message: error.message, onBack: () => navigate("/groups"), onRetry: id ? () => load(id) : undefined })) : group ? (_jsx(Notebook, { group: group, currentUserId: session.user.id, currentUserName: session.user.name, copied: copied, onCopy: onCopy, expenseFormOpen: expenseFormOpen, onOpenExpenseForm: () => setExpenseFormOpen(true), onCloseExpenseForm: () => setExpenseFormOpen(false), activeTab: activeTab, onActiveTabChange: setActiveTab, counts: counts, onCountChange: handleCountChange })) : (_jsx(GroupSkeleton, {}))] }) }));
}
