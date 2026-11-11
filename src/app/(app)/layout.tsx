import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 md:block">
        <Sidebar
          user={{
            name: session.user.name ?? "",
            role: session.user.role,
            email: session.user.email ?? "",
          }}
          role={{ name: session.user.role, permissions: session.user.permissions }}
        />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
