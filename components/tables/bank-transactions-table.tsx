"use client";

import { startTransition } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { matchTransactionAction } from "@/lib/actions/banking.actions";
import { formatCurrency, formatDate } from "@/lib/format";
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

type BankTxnRow = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference?: string | null;
  match_status: string;
};

export function BankTransactionsTable({
  orgId,
  transactions,
  reconciliationSessionId,
  currencyCode,
}: {
  orgId: string;
  transactions: BankTxnRow[];
  reconciliationSessionId?: string;
  currencyCode?: string | null;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Match</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length ? (
            transactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                <TableCell className="max-w-[20rem] truncate">{txn.description}</TableCell>
                <TableCell>{txn.reference ?? "-"}</TableCell>
                <TableCell>{formatCurrency(txn.amount, currencyCode || undefined)}</TableCell>
                <TableCell>
                  <Badge variant={txn.match_status === "matched" ? "default" : "outline"}>
                    {txn.match_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!reconciliationSessionId || txn.match_status === "matched"}
                    onClick={() =>
                      startTransition(async () => {
                        if (!reconciliationSessionId) {
                          toast.error("Start a reconciliation session first.");
                          return;
                        }
                        const result = await matchTransactionAction({
                          orgId,
                          reconciliation_session_id: reconciliationSessionId,
                          bank_transaction_id: txn.id,
                          match_amount: Math.abs(txn.amount),
                          // UNSPECIFIED: UI matching candidate selection; scaffolding uses manual follow-up.
                        });
                        if (!result.success) {
                          toast.error(result.error || "Failed to match transaction.");
                          return;
                        }
                        toast.success("Transaction marked as matched (scaffold).");
                      })
                    }
                  >
                    <Link2 className="size-4" />
                    Match
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No bank transactions imported yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
