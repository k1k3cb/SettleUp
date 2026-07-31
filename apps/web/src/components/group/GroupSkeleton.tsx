export function GroupSkeleton() {
  return (
    <div className="mt-10 sm:mt-12 receipt">
      <div className="bg-card border-x border-ink/12 px-7 py-7 sm:px-9 space-y-5">
        <div className="h-3 w-20 bg-ink/10" />
        <div className="h-9 w-3/4 bg-ink/10" />
        <div className="h-3 w-1/2 bg-ink/10" />
        <div className="h-14 w-full bg-ink/5 mt-6" />
        <div className="h-3 w-2/3 bg-ink/5" />
      </div>
    </div>
  );
}

export function SignersSkeleton({ count }: { count: number }) {
  return (
    <ul className="divide-y divide-ink/10">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="px-7 py-4 sm:px-9 flex items-center gap-4"
          aria-hidden
        >
          <span className="size-2 rounded-full bg-ink/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-ink/10" />
            <div className="h-2.5 w-24 bg-ink/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BalancesSkeleton() {
  return (
    <ul className="mt-3 divide-y divide-ink/10" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="py-3 flex items-center gap-3">
          <span className="size-2 rounded-full bg-ink/10" />
          <div className="flex-1 h-3.5 bg-ink/10" />
          <div className="w-12 h-3.5 bg-ink/10" />
        </li>
      ))}
    </ul>
  );
}
