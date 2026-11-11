import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { updateDealStage } from "@/app/(app)/crm/actions";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { DEAL_STAGES } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const deals = await db.deal.findMany({
    where: { archived: false },
    include: {
      company: { select: { name: true } },
      contact: { select: { name: true } },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const byStage = DEAL_STAGES.map((stage) => ({
    ...stage,
    deals: deals.filter((d) => d.stage === stage.value),
  }));

  const totalValue = deals
    .filter((d) => !["LOST"].includes(d.stage))
    .reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Deals</h1>
          <p className="text-sm text-muted-foreground">
            {deals.length} deals · {formatCurrency(totalValue)} in pipeline
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/crm/deals/new">
            <Plus className="size-4" /> New deal
          </ButtonLink>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {byStage.map((stage) => (
          <div key={stage.value} className="w-64 shrink-0 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between px-3 py-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage.color}`}>
                {stage.label}
              </span>
              <span className="text-xs text-muted-foreground">{stage.deals.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {stage.deals.map((deal) => (
                <div key={deal.id} className="rounded-md border bg-background p-3">
                  <Link href={`/crm/deals/${deal.id}`} className="text-sm font-medium hover:underline">
                    {deal.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {deal.company.name}
                    {deal.contact ? ` · ${deal.contact.name}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{formatCurrency(deal.value)}</span>
                    <span className="text-xs text-muted-foreground">
                      {deal.probability}%
                    </span>
                  </div>
                  {deal.expectedCloseDate && (
                    <p className="text-xs text-muted-foreground">
                      Close: {formatDate(deal.expectedCloseDate)}
                    </p>
                  )}
                  {canEdit && (
                    <form action={updateDealStage} className="mt-2 flex gap-1">
                      <input type="hidden" name="id" value={deal.id} />
                      <NativeSelect name="stage" defaultValue={deal.stage} aria-label="Move deal">
                        {DEAL_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button type="submit" size="sm" variant="outline">
                        Move
                      </Button>
                    </form>
                  )}
                </div>
              ))}
              {stage.deals.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No deals here
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
