import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth";
import { groupsService, type GroupDetail } from "@/services/groups";
import { ApiError } from "@/lib/api";
import { GroupHeader } from "@/components/group/GroupHeader";
import { Notebook } from "@/components/group/Notebook";
import {
  GroupErrorState,
  type GroupErrorKind,
} from "@/components/group/GroupErrorState";
import { GroupSkeleton } from "@/components/group/GroupSkeleton";
import { useGroupRealtime } from "@/hooks/useGroupRealtime";

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
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<{
    kind: GroupErrorKind;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "signers" | "expenses" | "balances"
  >("signers");
  const [counts, setCounts] = useState<{
    signers: number | null;
    expenses: number | null;
    balances: number | null;
  }>({ signers: null, expenses: null, balances: null });

  // useCallback con [] para que la referencia sea estable. Si se
  // creara inline en cada render, los useEffect de los hijos que
  // dependen de onCountChange se dispararían en bucle infinito.
  const handleCountChange = useCallback(
    (key: "signers" | "expenses" | "balances", n: number | null) => {
      setCounts((prev) => ({ ...prev, [key]: n }));
    },
    [],
  );

  // Realtime sync: en local con VITE_WS_URL abre socket a Socket.IO;
  // en producción (Vercel) cae a polling cada 15s. Misma API,
  // cero impacto en el render.
  useGroupRealtime(id);

  useEffect(() => {
    if (isPending) return;
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
        <GroupHeader
          userName={session.user.name}
          onSignOut={async () => {
            await signOut();
            navigate("/signin", { replace: true });
          }}
        />

        {error ? (
          <GroupErrorState
            kind={error.kind}
            message={error.message}
            onBack={() => navigate("/groups")}
            onRetry={id ? () => load(id) : undefined}
          />
        ) : group ? (
          <Notebook
            group={group}
            currentUserId={session.user.id}
            currentUserName={session.user.name}
            copied={copied}
            onCopy={onCopy}
            expenseFormOpen={expenseFormOpen}
            onOpenExpenseForm={() => setExpenseFormOpen(true)}
            onCloseExpenseForm={() => setExpenseFormOpen(false)}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            counts={counts}
            onCountChange={handleCountChange}
          />
        ) : (
          <GroupSkeleton />
        )}
      </div>
    </div>
  );
}
