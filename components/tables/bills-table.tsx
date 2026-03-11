"use client";

import Link from "next/link";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { postBillAction } from "@/lib/actions/bills.actions";
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

type BillRow = {
  id: string;
  bill_no?: string | null;
  bill_date: string;
  due_date: string;
  status: string;
  currency_code?: string | null;
  total: number;
};

export function BillsTable({
  orgId,
  bills,
  currencyCode,
  canManagePurchases = false,
}: {
  orgId: string;
  bills: BillRow[];
  currencyCode?: string | null;
  canManagePurchases?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bill</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.length ? (
            bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">
                  <Link href={`/${orgId}/bills/${bill.id}`} className="hover:underline">
                    {bill.bill_no ?? bill.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(bill.bill_date)}</TableCell>
                <TableCell>{formatDate(bill.due_date)}</TableCell>
                <TableCell>
                  <Badge variant={bill.status === "posted" ? "default" : "secondary"}>
                    {bill.status}
                  </Badge>
                </TableCell>
                <TableCell>{String(bill.currency_code ?? currencyCode ?? "-")}</TableCell>
                <TableCell>
                  {formatCurrency(
                    bill.total,
                    (bill.currency_code as string | null | undefined) || currencyCode || undefined
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManagePurchases && (bill.status === "draft" || bill.status === "approved") ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await postBillAction({ orgId, billId: bill.id });
                          if (!result.success) {
                            toast.error(result.error || "Failed to post bill.");
                            return;
                          }
                          toast.success("Bill posted.");
                          router.refresh();
                        })
                      }
                    >
                      <Send className="size-4" />
                      Post
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No bills.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
