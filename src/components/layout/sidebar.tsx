import Link from "next/link";
import { NavItems } from "@/components/layout/nav-items";
import { UserMenu } from "@/components/layout/user-menu";

interface SidebarProps {
  user: {
    name: string;
    role: string;
    email: string;
  };
  role: { name: string; permissions: unknown } | null;
}

export function Sidebar({ user, role }: SidebarProps) {
  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ERP
        </Link>
      </div>
      <NavItems role={role} />
      <div className="border-t p-3">
        <UserMenu name={user.name} role={user.role} email={user.email} />
      </div>
    </div>
  );
}
