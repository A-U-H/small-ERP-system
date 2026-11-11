import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { FinanceNav } from "@/components/layout/finance-nav";

export const dynamic = "force-dynamic";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "finance", "view")) redirect("/");

  return (
    <div className="space-y-4">
      <FinanceNav />
      {children}
    </div>
  );
}
