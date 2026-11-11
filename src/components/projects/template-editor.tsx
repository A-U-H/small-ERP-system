"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface TaskDraft {
  name: string;
}

interface MilestoneDraft {
  name: string;
  tasks: TaskDraft[];
}

export function TemplateEditor() {
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);

  const addMilestone = () => setMilestones((prev) => [...prev, { name: "", tasks: [] }]);
  const removeMilestone = (i: number) =>
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const renameMilestone = (i: number, name: string) =>
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? { ...m, name } : m)));

  const addTask = (i: number) =>
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, tasks: [...m.tasks, { name: "" }] } : m)),
    );
  const removeTask = (i: number, j: number) =>
    setMilestones((prev) =>
      prev.map((m, idx) =>
        idx === i ? { ...m, tasks: m.tasks.filter((_, tIdx) => tIdx !== j) } : m,
      ),
    );
  const renameTask = (i: number, j: number, name: string) =>
    setMilestones((prev) =>
      prev.map((m, idx) =>
        idx === i
          ? { ...m, tasks: m.tasks.map((t, tIdx) => (tIdx === j ? { ...t, name } : t)) }
          : m,
      ),
    );

  return (
    <div className="space-y-4">
      <input type="hidden" name="milestones" value={JSON.stringify(milestones)} />

      {milestones.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No milestones yet — add a milestone to structure the template.
        </p>
      )}

      {milestones.map((milestone, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={milestone.name}
              onChange={(e) => renameMilestone(i, e.target.value)}
              placeholder="Milestone name"
              maxLength={150}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeMilestone(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {milestone.tasks.map((task, j) => (
              <div key={j} className="flex items-center gap-2 pl-4">
                <Input
                  value={task.name}
                  onChange={(e) => renameTask(i, j, e.target.value)}
                  placeholder="Task name"
                  maxLength={150}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeTask(i, j)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addTask(i)}>
              <Plus className="size-4" /> Add task
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addMilestone}>
        <Plus className="size-4" /> Add milestone
      </Button>
    </div>
  );
}
