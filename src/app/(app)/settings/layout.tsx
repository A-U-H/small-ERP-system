import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/permissions";
import { SettingsNav } from "@/components/layout/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "settings", "view")) redirect("/");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Administrative configuration for your workspace.
        </p>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
