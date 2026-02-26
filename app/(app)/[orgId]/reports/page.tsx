import { endOfMonth, formatISO, startOfMonth } from "date-fns";
import {
  getBalanceSheet,
  getCustomerTransactionRows,
  getProfitAndLoss,
  summarizeCustomerTransactionRows,
  getTrialBalance,
} from "@/lib/data/reports.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { ReportsSummaryChart } from "@/components/charts/reports-summary-chart";
import { ExportCsvButton } from "@/components/tables/export-csv-button";
import { ReportTable } from "@/components/tables/report-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const now = new Date();
  const startDate = formatISO(startOfMonth(now), { representation: "date" });
  const endDate = formatISO(endOfMonth(now), { representation: "date" });

  const [trialBalance, pnl, balanceSheet, customerTransactions, org] = await Promise.all([
    getTrialBalance(orgId, endDate),
    getProfitAndLoss(orgId, startDate, endDate),
    getBalanceSheet(orgId, endDate),
    getCustomerTransactionRows(orgId, startDate, endDate),
    getOrganizationById(orgId),
  ]);
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;
  const customerTransactionSummary = summarizeCustomerTransactionRows(
    customerTransactions as Array<Record<string, string | number | null | undefined>>
  );

  const summaryChartData = [
    {
      label: "Income",
      amount: (pnl as Array<Record<string, unknown>>)
        .filter((row) => String(row.category) === "income")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    },
    {
      label: "Expenses",
      amount: (pnl as Array<Record<string, unknown>>)
        .filter((row) => String(row.category) === "expense")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    },
    {
      label: "Assets",
      amount: (balanceSheet as Array<Record<string, unknown>>)
        .filter((row) => String(row.category) === "asset")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Trial Balance, Profit &amp; Loss, and Balance Sheet from posted journal lines grouped by account type.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsSummaryChart data={summaryChartData} currencyCode={baseCurrency} />
        </CardContent>
      </Card>

      <Tabs defaultValue="trial-balance" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="customer-transactions">Customer Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="space-y-3">
          <div className="flex justify-end">
            <ExportCsvButton filename={`trial-balance-${endDate}.csv`} rows={trialBalance as never[]} />
          </div>
          <ReportTable
            rows={trialBalance as never[]}
            currencyCode={baseCurrency}
            columns={[
              { key: "account_code", label: "Code" },
              { key: "account_name", label: "Account" },
              { key: "account_type", label: "Type" },
              { key: "debit", label: "Debit", type: "currency" },
              { key: "credit", label: "Credit", type: "currency" },
              { key: "balance", label: "Balance", type: "currency" },
            ]}
          />
        </TabsContent>

        <TabsContent value="pnl" className="space-y-3">
          <div className="flex justify-end">
            <ExportCsvButton filename={`pnl-${startDate}-to-${endDate}.csv`} rows={pnl as never[]} />
          </div>
          <ReportTable
            rows={pnl as never[]}
            currencyCode={baseCurrency}
            columns={[
              { key: "category", label: "Category" },
              { key: "account_code", label: "Code" },
              { key: "account_name", label: "Account" },
              { key: "amount", label: "Amount", type: "currency" },
            ]}
          />
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-3">
          <div className="flex justify-end">
            <ExportCsvButton filename={`balance-sheet-${endDate}.csv`} rows={balanceSheet as never[]} />
          </div>
          <ReportTable
            rows={balanceSheet as never[]}
            currencyCode={baseCurrency}
            columns={[
              { key: "category", label: "Category" },
              { key: "account_code", label: "Code" },
              { key: "account_name", label: "Account" },
              { key: "amount", label: "Amount", type: "currency" },
            ]}
          />
        </TabsContent>

        <TabsContent value="customer-transactions" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Customer transaction exports for the report period ({startDate} to {endDate}).
            </p>
            <div className="flex flex-wrap gap-2">
              <ExportCsvButton
                filename={`customer-transaction-summary-${startDate}-to-${endDate}.csv`}
                rows={customerTransactionSummary as never[]}
              />
              <ExportCsvButton
                filename={`customer-transactions-${startDate}-to-${endDate}.csv`}
                rows={customerTransactions as never[]}
              />
            </div>
          </div>
          <ReportTable
            rows={customerTransactionSummary as never[]}
            currencyCode={baseCurrency}
            columns={[
              { key: "customer_name", label: "Customer" },
              { key: "invoice_count", label: "Invoices" },
              { key: "invoice_total", label: "Invoice Total", type: "currency" },
              { key: "receipt_count", label: "Receipts" },
              { key: "receipt_total", label: "Receipt Total", type: "currency" },
              { key: "net_balance", label: "Net AR", type: "currency" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
