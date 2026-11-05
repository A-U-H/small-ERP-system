export function Badge({
  value,
  map,
}: {
  value: string;
  map: Record<string, { label: string; color: string }>;
}) {
  const entry = map[value] ?? { label: value, color: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entry.color}`}>
      {entry.label}
    </span>
  );
}
