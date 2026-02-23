import { PlusCircle } from "lucide-react";
import { listAccounts } from "@/lib/data/coa.data";
import { CoaTable } from "@/components/tables/coa-table";
import { AccountForm } from "@/components/forms/account-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CoaPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const accounts = await listAccounts(orgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Chart of Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Maintain your ledger accounts. Posted journal lines remain immutable by database rules.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="size-4" />
              New account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create account</DialogTitle>
            </DialogHeader>
            <AccountForm orgId={orgId} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <CoaTable orgId={orgId} accounts={accounts as never[]} />
        </CardContent>
      </Card>
    </div>
  );
}
