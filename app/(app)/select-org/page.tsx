import { redirect } from "next/navigation";
import { listUserOrganizations } from "@/lib/data/org.data";
import { OrgCreateForm } from "@/components/forms/org-create-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SelectOrgPage() {
  const orgs = await listUserOrganizations();

  if (orgs.length === 1) {
    redirect(`/${orgs[0].org_id}/dashboard`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgs.length ? (
              orgs.map((org) => (
                <div
                  key={org.org_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">{org.organization?.name ?? org.org_id}</div>
                    <div className="text-sm text-muted-foreground">
                      Role: {org.role} · Currency: {org.organization?.base_currency ?? "USD"}
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/${org.org_id}/dashboard`}>Open</Link>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No organizations found. Create your first organization to continue.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgCreateForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
