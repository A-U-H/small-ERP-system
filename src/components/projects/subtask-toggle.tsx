"use client";

import { toggleSubtask } from "@/app/(app)/projects/actions";

export function SubtaskToggle({
  id,
  projectId,
  done,
  label,
}: {
  id: string;
  projectId: string;
  done: boolean;
  label: string;
}) {
  return (
    <form action={toggleSubtask}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="done"
          defaultChecked={done}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="size-4"
        />
        <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
      </label>
    </form>
  );
}
