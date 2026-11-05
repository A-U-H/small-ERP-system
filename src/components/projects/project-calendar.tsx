"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/app/(app)/projects/calendar/page";

const TYPE_STYLES: Record<CalendarEvent["type"], string> = {
  task: "border-blue-300 bg-blue-50 text-blue-800",
  milestone: "border-amber-300 bg-amber-50 text-amber-800",
  project: "border-emerald-300 bg-emerald-50 text-emerald-800",
  sprint: "border-violet-300 bg-violet-50 text-violet-800",
};

export function ProjectCalendar({ events }: { events: CalendarEvent[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setMonth(new Date())}
            className="rounded-md px-2 py-1 text-sm font-medium hover:bg-accent"
          >
            Today
          </button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = byDate.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                "min-h-24 border-b border-r p-1.5",
                !inMonth && "bg-muted/30 opacity-60",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-primary font-semibold text-primary-foreground",
                  !isToday(day) && "text-muted-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <Link
                    key={`${key}-${i}`}
                    href={event.href}
                    className={cn(
                      "block truncate rounded border px-1.5 py-0.5 text-[11px] font-medium",
                      TYPE_STYLES[event.type],
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[11px] text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
