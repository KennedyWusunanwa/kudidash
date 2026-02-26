import { listAccountsForSelect } from "@/lib/data/coa.data";
import {
  listBankAccounts,
  listBankTransactions,
  listReconciliationSessions,
} from "@/lib/data/banking.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { BankAccountForm } from "@/components/forms/bank-account-form";
import { BankCsvImportForm } from "@/components/forms/bank-csv-import-form";
import { ReconciliationSessionForm } from "@/components/forms/reconciliation-session-form";
import { BankTransactionsTable } from "@/components/tables/bank-transactions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function BankingReconciliationPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [accounts, bankAccounts, transactions, sessions, org] = await Promise.all([
    listAccountsForSelect(orgId),
    listBankAccounts(orgId),
    listBankTransactions(orgId),
    listReconciliationSessions(orgId),
    getOrganizationById(orgId),
  ]);
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;
  const bankAccountsById = new Map(
    (bankAccounts as Array<Record<string, unknown>>).map((account) => [String(account.id), account])
  );

  const latestOpenSession = (sessions as Array<Record<string, unknown>>).find(
    (s) => String(s.status) === "open"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Bank Reconciliation</h2>
        <p className="text-sm text-muted-foreground">
          Import transactions, start reconciliation sessions, and match entries. Matching supports
          manual linking and can be extended with automated candidate scoring.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BankAccountForm
              orgId={orgId}
              glAccounts={accounts.filter((a) => a.type === "asset")}
            />
            <div className="space-y-2">
              {(bankAccounts as Array<Record<string, unknown>>).length ? (
                (bankAccounts as Array<Record<string, unknown>>).map((account) => (
                  <div key={String(account.id)} className="rounded-lg border p-3">
                    <div className="font-medium">{String(account.name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {String(account.currency_code ?? "GHS")} · {String(account.account_number_masked ?? "-")}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No bank accounts configured.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import bank transactions (CSV)</CardTitle>
          </CardHeader>
          <CardContent>
            <BankCsvImportForm
              orgId={orgId}
              bankAccounts={(bankAccounts as Array<Record<string, unknown>>).map((b) => ({
                id: String(b.id),
                name: String(b.name),
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start reconciliation session</CardTitle>
          </CardHeader>
          <CardContent>
            <ReconciliationSessionForm
              orgId={orgId}
              bankAccounts={(bankAccounts as Array<Record<string, unknown>>).map((b) => ({
                id: String(b.id),
                name: String(b.name),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(sessions as Array<Record<string, unknown>>).length ? (
              (sessions as Array<Record<string, unknown>>).map((session) => (
                <div key={String(session.id)} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {formatDate(String(session.statement_start_date ?? ""))} -{" "}
                        {formatDate(String(session.statement_end_date ?? ""))}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        Status: {String(session.status ?? "open")}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(
                        Number(session.statement_ending_balance ?? 0),
                        (bankAccountsById.get(String(session.bank_account_id ?? ""))?.currency_code as
                          | string
                          | undefined) || baseCurrency
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reconciliation sessions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imported bank transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <BankTransactionsTable
            orgId={orgId}
            transactions={transactions as never[]}
            currencyCode={baseCurrency}
            reconciliationSessionId={
              latestOpenSession ? String(latestOpenSession.id) : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
