"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Users2,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { hasAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Module } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  module: Module;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/", module: "dashboard", icon: LayoutDashboard },
  { title: "CRM", href: "/crm", module: "crm", icon: Users },
  { title: "Projects", href: "/projects", module: "projects", icon: FolderKanban },
  { title: "Team", href: "/team", module: "team", icon: Users2 },
  { title: "Finance", href: "/finance", module: "finance", icon: Wallet },
  { title: "Settings", href: "/settings", module: "settings", icon: Settings },
];

export function NavItems({ role }: { role: { name: string; permissions: unknown } | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV_ITEMS.map((item) => {
        const visible = item.module === "dashboard" ? true : hasAccess(role, item.module, "view");
        if (!visible) return null;

        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
