export function StatusBadge({
  label,
  ok,
}: {
  label: string;
  ok: boolean | null;
}) {
  const color =
    ok === null
      ? "bg-zinc-200 text-zinc-700"
      : ok
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-900";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export { formatCents };
