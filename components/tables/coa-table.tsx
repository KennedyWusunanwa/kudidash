"use client";

import { startTransition, useOptimistic, useState } from "react";
import { Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { deactivateAccountAction } from "@/lib/actions/coa.actions";
import { formatDate } from "@/lib/format";
import { AccountForm } from "@/components/forms/account-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CoaRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  sub_type: string;
  currency_code: string;
  is_active: boolean;
  created_at?: string;
};

export function CoaTable({ orgId, accounts }: { orgId: string; accounts: CoaRow[] }) {
  const [optimisticRows, applyOptimistic] = useOptimistic(
    accounts,
    (state: CoaRow[], update: { id: string; is_active: boolean }) =>
      state.map((row) => (row.id === update.id ? { ...row, is_active: update.is_active } : row))
  );
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const deactivate = (accountId: string) => {
    applyOptimistic({ id: accountId, is_active: false });
    startTransition(async () => {
      const result = await deactivateAccountAction({ orgId, id: accountId });
      if (!result.success) {
        toast.error(result.error || "Failed to deactivate account.");
        return;
      }
      toast.success("Account deactivated.");
    });
  };

  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Subtype</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticRows.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell className="capitalize">{account.type}</TableCell>
                <TableCell className="capitalize">{account.sub_type.replace(/_/g, " ")}</TableCell>
                <TableCell>{account.currency_code}</TableCell>
                <TableCell>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(account.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog
                      open={editingAccountId === account.id}
                      onOpenChange={(open) => setEditingAccountId(open ? account.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit account</DialogTitle>
                        </DialogHeader>
                        <AccountForm
                          orgId={orgId}
                          account={account as any}
                          onSuccess={() => setEditingAccountId(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deactivate(account.id)}
                      disabled={!account.is_active}
                    >
                      <Power className="size-4" />
                      Deactivate
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {optimisticRows.map((account) => (
          <div key={account.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">
                  {account.code} · {account.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.type} / {account.sub_type}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {account.currency_code} · {formatDate(account.created_at)}
                </div>
              </div>
              <Badge variant={account.is_active ? "default" : "secondary"}>
                {account.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Dialog
                open={editingAccountId === account.id}
                onOpenChange={(open) => setEditingAccountId(open ? account.id : null)}
              >
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit account</DialogTitle>
                  </DialogHeader>
                  <AccountForm orgId={orgId} account={account as any} onSuccess={() => setEditingAccountId(null)} />
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deactivate(account.id)}
                disabled={!account.is_active}
              >
                <Power className="size-4" />
                Deactivate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
