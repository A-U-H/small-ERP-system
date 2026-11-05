import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { CrmNav } from "@/components/layout/crm-nav";

export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "crm", "view")) redirect("/");

  return (
    <div className="space-y-4">
      <CrmNav />
      {children}
    </div>
  );
}
