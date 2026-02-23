import Link from "next/link";
import { getDashboardKpis, getRevenueExpenseSeries } from "@/lib/data/reports.data";
import { listBillsToApprove } from "@/lib/data/bills.data";
import { listRecentInvoices } from "@/lib/data/invoices.data";
import { listPendingJournals } from "@/lib/data/journals.data";
import { ChartCard } from "@/components/app-shell/chart-card";
import { KpiCard } from "@/components/app-shell/kpi-card";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { ExpensesLineChart } from "@/components/charts/expenses-line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [kpis, series, recentInvoices, billsToApprove, pendingJournals] = await Promise.all([
    getDashboardKpis(orgId),
    getRevenueExpenseSeries(orgId),
    listRecentInvoices(orgId),
    listBillsToApprove(orgId),
    listPendingJournals(orgId),
  ]);

  const normalizedSeries: Array<{
    period: string;
    revenue: number;
    expenses: number;
  }> = (series ?? []).map((row: Record<string, unknown>) => ({
    period: String(row.period ?? row.period_label ?? row.month ?? ""),
    revenue: Number(row.revenue ?? 0),
    expenses: Number(row.expenses ?? 0),
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Cash" value={Number(kpis.cash ?? 0)} description="UNSPECIFIED mapping uses org account settings." />
        <KpiCard
          title="Revenue MTD"
          value={Number(kpis.revenue_mtd ?? 0)}
          description="Posted income credits"
        />
        <KpiCard
          title="Expenses MTD"
          value={Number(kpis.expenses_mtd ?? 0)}
          description="Posted expense debits"
        />
        <KpiCard title="AR" value={Number(kpis.ar ?? 0)} description="Control account balance" />
        <KpiCard title="AP" value={Number(kpis.ap ?? 0)} description="Control account balance" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Revenue by Period" subtitle="Monthly posted revenue">
          <RevenueAreaChart data={normalizedSeries.map((row) => ({ period: row.period, revenue: row.revenue }))} />
        </ChartCard>
        <ChartCard title="Expenses by Period" subtitle="Monthly posted expenses">
          <ExpensesLineChart data={normalizedSeries.map((row) => ({ period: row.period, expenses: row.expenses }))} />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent invoices</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgId}/invoices`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentInvoices.length ? (
              recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/${orgId}/invoices/${invoice.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{invoice.invoice_no ?? invoice.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.invoice_date)} · {invoice.status}
                    </p>
                  </div>
                  <div className="text-sm">{formatCurrency(Number(invoice.total ?? 0))}</div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Bills to approve</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgId}/bills`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {billsToApprove.length ? (
              billsToApprove.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/${orgId}/bills/${bill.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{bill.bill_no ?? bill.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(bill.bill_date)}</p>
                  </div>
                  <div className="text-sm">{formatCurrency(Number(bill.total ?? 0))}</div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No draft bills awaiting approval.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Journals pending approval</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${orgId}/journals`}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingJournals.length ? (
              pendingJournals.slice(0, 5).map((journal) => (
                <Link
                  key={journal.id}
                  href={`/${orgId}/journals/${journal.id}`}
                  className="block rounded-lg border p-3 hover:bg-accent"
                >
                  <p className="text-sm font-medium">{journal.journal_no ?? journal.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(journal.entry_date)} · {journal.status}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No approved journals pending post.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
