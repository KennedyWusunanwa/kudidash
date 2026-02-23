"use client";

import Link from "next/link";
import { startTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { postInvoiceAction } from "@/lib/actions/invoices.actions";
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

type InvoiceRow = {
  id: string;
  invoice_no?: string | null;
  invoice_date: string;
  due_date: string;
  status: string;
  total: number;
};

export function InvoicesTable({ orgId, invoices }: { orgId: string; invoices: InvoiceRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length ? (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/${orgId}/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoice_no ?? invoice.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "posted" ? "default" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(invoice.total)}</TableCell>
                <TableCell className="text-right">
                  {invoice.status === "draft" || invoice.status === "approved" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await postInvoiceAction({ orgId, invoiceId: invoice.id });
                          if (!result.success) {
                            toast.error(result.error || "Failed to post invoice.");
                            return;
                          }
                          toast.success("Invoice posted.");
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
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No invoices.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
