import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [contacts, companies] = await Promise.all([
    db.contact.findMany({
      where: {
        archived: false,
        ...(params.company ? { companyId: params.company } : {}),
      },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    db.company.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Contacts</h1>
        {canEdit && (
          <ButtonLink href="/crm/contacts/new">
            <Plus className="size-4" /> New contact
          </ButtonLink>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <NativeSelect name="company" defaultValue={params.company ?? ""} className="max-w-72">
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Position</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2">
                    <Link href={`/crm/companies/${contact.companyId}`} className="font-medium hover:underline">
                      {contact.name}
                    </Link>
                    {contact.isPrimary && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{contact.company.name}</td>
                  <td className="px-4 py-2">{contact.position ?? "—"}</td>
                  <td className="px-4 py-2">{contact.email ?? "—"}</td>
                  <td className="px-4 py-2">{contact.phone ?? "—"}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
