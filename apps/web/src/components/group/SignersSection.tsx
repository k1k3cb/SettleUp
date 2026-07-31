import { useEffect, useRef } from "react";
import type { GroupDetail } from "@/services/groups";
import type { GroupMember } from "@/services/members";
import { formatLongDate } from "@/lib/formatters";
import { SignersSkeleton } from "./GroupSkeleton";

export function SignersSection({
  group,
  currentUserId,
  members,
  membersLoading,
  membersError,
  onCountChange,
}: {
  group: GroupDetail;
  currentUserId: string;
  members: GroupMember[] | null;
  membersLoading: boolean;
  membersError: string | null;
  onCountChange?: (n: number | null) => void;
}) {
  // El padre necesita saber el número de firmantes para mostrar el
  // contador en la tab. El callback va en un ref y el useEffect solo
  // depende del valor (`members`) para no causar bucle infinito si el
  // padre pasa el callback inline.
  const onCountChangeRef = useRef<(n: number | null) => void>(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  });
  useEffect(() => {
    onCountChangeRef.current?.(members ? members.length : null);
  }, [members]);

  return (
    <section aria-label="Firmantes de la cuenta" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/45">
          Firmantes
        </p>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40">
          {members
            ? `${members.length} ${members.length === 1 ? "persona" : "personas"}`
            : "—"}
        </p>
      </div>

      <article className="receipt relative">
        <div className="bg-card border-x border-ink/12">
          {membersError ? (
            <div className="px-7 py-6 sm:px-9">
              <p className="text-sm text-ink/65">
                {membersError}{" "}
                <span className="text-ink/40">— puedes seguir mirando la cuenta.</span>
              </p>
            </div>
          ) : membersLoading || members === null ? (
            <SignersSkeleton count={2} />
          ) : members.length === 0 ? (
            <div className="px-7 py-6 sm:px-9">
              <p className="text-sm text-ink/55">Nadie ha firmado todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {members.map((m) => (
                <SignerRow
                  key={m.userId}
                  name={m.name}
                  joinedAt={m.joinedAt}
                  isCurrent={m.userId === currentUserId}
                  isOwner={m.userId === group.createdBy}
                />
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-dashed border-ink/20 px-7 py-3 sm:px-9 text-xs text-ink/55">
            <span>Cada firma entra en el cuaderno.</span>
            <span className="font-mono tracking-wider">#firmas</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function SignerRow({
  name,
  joinedAt,
  isCurrent,
  isOwner,
}: {
  name: string;
  joinedAt: string;
  isCurrent: boolean;
  isOwner: boolean;
}) {
  return (
    <li className="px-7 py-4 sm:px-9 flex items-center gap-4">
      <span
        aria-hidden
        className="font-mono text-ink/30 text-lg leading-none -mt-0.5 select-none"
      >
        ·
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold tracking-[-0.01em] text-ink truncate">
          {name}
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45">
          desde el {formatLongDate(joinedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isCurrent && !isOwner && <YouChip />}
        {isOwner && <OwnerStamp isYou={isCurrent} />}
      </div>
    </li>
  );
}

function YouChip() {
  return (
    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/65 border-b border-ink/30 pb-0.5">
      Tú
    </span>
  );
}

function OwnerStamp({ isYou }: { isYou: boolean }) {
  return (
    <span aria-hidden className="stamp relative select-none">
      <span className="inline-block border-[1.5px] border-accent rounded-[3px] px-2.5 py-1 rotate-[-6deg]">
        <span className="block font-mono text-[10px] tracking-[0.26em] uppercase text-accent leading-none">
          {isYou ? "Tú · abriste" : "Abierto por"}
        </span>
      </span>
    </span>
  );
}
