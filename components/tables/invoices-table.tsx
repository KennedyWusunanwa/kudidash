"use client";

import Link from "next/link";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getInvoiceDisplayStatus } from "@/lib/accounting/invoice-status";
import { deleteInvoiceAction, postInvoiceAction } from "@/lib/actions/invoices.actions";
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
  currency_code?: string | null;
  total: number;
  amount_paid?: number | null;
};

export function InvoicesTable({
  orgId,
  invoices,
  canManageSales = false,
  canManageAdmin = false,
}: {
  orgId: string;
  invoices: InvoiceRow[];
  canManageSales?: boolean;
  canManageAdmin?: boolean;
}) {
  const router = useRouter();

  const deleteInvoice = (invoice: InvoiceRow) => {
    const label = invoice.invoice_no ?? invoice.id.slice(0, 8);
    if (!window.confirm(`Delete invoice ${label}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteInvoiceAction({ orgId, invoiceId: invoice.id });
      if (!result.success) {
        toast.error(result.error || "Failed to delete invoice.");
        return;
      }
      toast.success("Invoice deleted.");
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length ? (
            invoices.map((invoice) => {
              const canModifyDraft =
                invoice.status === "draft" || invoice.status === "approved";
              const displayStatus = getInvoiceDisplayStatus(
                invoice.status,
                invoice.amount_paid,
                invoice.total
              );
              return (
                <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/${orgId}/invoices/${invoice.id}`} className="hover:underline">
                    {invoice.invoice_no ?? invoice.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                <TableCell>
                  <Badge variant={displayStatus === "paid" ? "default" : "secondary"}>
                    {displayStatus}
                  </Badge>
                </TableCell>
                <TableCell>{String(invoice.currency_code ?? "-")}</TableCell>
                <TableCell>{formatCurrency(invoice.total, invoice.currency_code || undefined)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {canManageAdmin && canModifyDraft ? (
                      <Button asChild type="button" size="sm" variant="outline">
                        <Link href={`/${orgId}/invoices/${invoice.id}/edit`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild type="button" size="sm" variant="outline">
                      <a href={`/${orgId}/invoices/${invoice.id}/pdf`}>
                        <Download className="size-4" />
                        PDF
                      </a>
                    </Button>

                    {canManageSales && canModifyDraft ? (
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
                            router.refresh();
                          })
                        }
                      >
                        <Send className="size-4" />
                        Post
                      </Button>
                    ) : null}
                    {canManageAdmin && canModifyDraft ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteInvoice(invoice)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No invoices.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
