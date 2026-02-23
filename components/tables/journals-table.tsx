"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  approveJournalAction,
  postJournalAction,
  reverseJournalAction,
} from "@/lib/actions/journals.actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type JournalRow = {
  id: string;
  journal_no?: string | null;
  entry_date: string;
  memo?: string | null;
  reference?: string | null;
  status: "draft" | "approved" | "posted" | "voided";
  posted_at?: string | null;
};

export function JournalsTable({ orgId, journals }: { orgId: string; journals: JournalRow[] }) {
  const [optimisticRows, applyOptimistic] = useOptimistic(
    journals,
    (state: JournalRow[], update: { id: string; status: JournalRow["status"] }) =>
      state.map((row) => (row.id === update.id ? { ...row, status: update.status } : row))
  );

  const approve = (journalId: string) => {
    applyOptimistic({ id: journalId, status: "approved" });
    startTransition(async () => {
      const result = await approveJournalAction({ orgId, journalId });
      if (!result.success) {
        toast.error(result.error || "Failed to approve journal.");
        return;
      }
      toast.success("Journal approved.");
    });
  };

  const post = (journalId: string) => {
    applyOptimistic({ id: journalId, status: "posted" });
    startTransition(async () => {
      const result = await postJournalAction({ orgId, journalId });
      if (!result.success) {
        toast.error(result.error || "Failed to post journal.");
        return;
      }
      toast.success("Journal posted.");
    });
  };

  const reverse = (journalId: string) => {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = await reverseJournalAction({
        orgId,
        journalId,
        reversalDate: today,
        reason: "User requested reversal",
      });
      if (!result.success) {
        toast.error(result.error || "Failed to reverse journal.");
        return;
      }
      toast.success("Reversal journal created.");
    });
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Journal</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Memo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticRows.length ? (
            optimisticRows.map((journal) => (
              <TableRow key={journal.id}>
                <TableCell className="font-medium">
                  <Link href={`/${orgId}/journals/${journal.id}`} className="hover:underline">
                    {journal.journal_no ?? journal.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(journal.entry_date)}</TableCell>
                <TableCell>{journal.reference ?? "-"}</TableCell>
                <TableCell className="max-w-[18rem] truncate">{journal.memo ?? "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      journal.status === "posted"
                        ? "default"
                        : journal.status === "approved"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {journal.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {journal.status === "draft" ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => approve(journal.id)}>
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                    ) : null}
                    {journal.status === "approved" ? (
                      <Button type="button" size="sm" onClick={() => post(journal.id)}>
                        <Send className="size-4" />
                        Post
                      </Button>
                    ) : null}
                    {journal.status === "posted" ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => reverse(journal.id)}>
                        <RotateCcw className="size-4" />
                        Reverse
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No journals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
