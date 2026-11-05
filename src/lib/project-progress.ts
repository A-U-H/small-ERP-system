export function projectProgress(
  tasks: { status: string; estimate: { toString(): string } | null }[],
): number {
  const total = tasks.reduce((s, t) => s + Number(t.estimate ?? 1), 0);
  if (total === 0) return 0;
  const done = tasks.reduce((s, t) => s + (t.status === "DONE" ? Number(t.estimate ?? 1) : 0), 0);
  return Math.round((done / total) * 100);
}
