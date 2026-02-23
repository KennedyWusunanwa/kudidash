import { notFound } from "next/navigation";
import { getJournal } from "@/lib/data/journals.data";
import { JournalsTable } from "@/components/tables/journals-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; journalId: string }>;
}) {
  const { orgId, journalId } = await params;
  let journal: Record<string, unknown>;
  try {
    journal = (await getJournal(orgId, journalId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const lines = Array.isArray(journal.journal_lines)
    ? (journal.journal_lines as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Journal</p>
            <p className="font-medium">{String(journal.journal_no ?? journal.id)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(String(journal.entry_date ?? ""))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{String(journal.status ?? "-")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reference</p>
            <p className="font-medium">{String(journal.reference ?? "-")}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-muted-foreground">Memo</p>
            <p className="font-medium">{String(journal.memo ?? "-")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow actions</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalsTable
            orgId={orgId}
            journals={[
              {
                id: String(journal.id),
                journal_no: (journal.journal_no as string | null | undefined) ?? null,
                entry_date: String(journal.entry_date ?? ""),
                memo: (journal.memo as string | null | undefined) ?? null,
                reference: (journal.reference as string | null | undefined) ?? null,
                status: (journal.status as "draft" | "approved" | "posted" | "voided") ?? "draft",
                posted_at: (journal.posted_at as string | null | undefined) ?? null,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length ? (
                  lines.map((line) => (
                    <TableRow key={String(line.id)}>
                      <TableCell>{String(line.line_no ?? "")}</TableCell>
                      <TableCell className="font-mono text-xs">{String(line.account_id ?? "")}</TableCell>
                      <TableCell>{String(line.description ?? "-")}</TableCell>
                      <TableCell>{formatNumber(Number(line.debit ?? 0))}</TableCell>
                      <TableCell>{formatNumber(Number(line.credit ?? 0))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No lines found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
