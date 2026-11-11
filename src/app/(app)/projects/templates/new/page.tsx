import { createTemplate } from "@/app/(app)/projects/actions";
import { TemplateEditor } from "@/components/projects/template-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default function NewTemplatePage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">New template</h1>
      <form action={createTemplate} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required maxLength={150} placeholder="e.g. Website build" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones &amp; tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateEditor />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit">Create template</Button>
          <ButtonLink href="/projects/templates" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
