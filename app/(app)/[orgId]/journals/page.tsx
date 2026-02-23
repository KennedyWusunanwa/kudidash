import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { listJournals } from "@/lib/data/journals.data";
import { JournalsTable } from "@/components/tables/journals-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statuses = ["all", "draft", "approved", "posted"] as const;

export default async function JournalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { orgId } = await params;
  const statusParam = (await searchParams)?.status ?? "all";
  const status = statuses.includes(statusParam as (typeof statuses)[number])
    ? statusParam
    : "all";
  const journals = await listJournals(orgId, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Journals</h2>
          <p className="text-sm text-muted-foreground">
            Draft → approved → posted workflow with immutable posted entries and reversal support.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${orgId}/journals/new`}>
            <PlusCircle className="size-4" />
            New journal
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((value) => (
          <Link
            key={value}
            href={value === "all" ? `/${orgId}/journals` : `/${orgId}/journals?status=${value}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
              status === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            {value}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal register</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalsTable orgId={orgId} journals={journals as never[]} />
        </CardContent>
      </Card>
    </div>
  );
}
