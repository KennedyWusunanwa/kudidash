import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { listBillsToApprove } from "@/lib/data/bills.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { listRecentInvoices } from "@/lib/data/invoices.data";
import { listPendingJournals } from "@/lib/data/journals.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { getDashboardKpis, getRevenueExpenseSeries } from "@/lib/data/reports.data";
import { ChartCard } from "@/components/app-shell/chart-card";
import { KpiCard } from "@/components/app-shell/kpi-card";
import { ExpensesLineChart } from "@/components/charts/expenses-line-chart";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [kpis, series, recentInvoices, billsToApprove, pendingJournals, org, inventoryItems] =
    await Promise.all([
      getDashboardKpis(orgId),
      getRevenueExpenseSeries(orgId),
      listRecentInvoices(orgId),
      listBillsToApprove(orgId),
      listPendingJournals(orgId),
      getOrganizationById(orgId),
      listInventoryItems(orgId),
    ]);

  const dashboardCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;

  const normalizedSeries: Array<{
    period: string;
    revenue: number;
    expenses: number;
  }> = (series ?? []).map((row: Record<string, unknown>) => ({
    period: String(row.period ?? row.period_label ?? row.month ?? ""),
    revenue: Number(row.revenue ?? 0),
    expenses: Number(row.expenses ?? 0),
  }));

  const inventoryValue = (inventoryItems as Array<Record<string, unknown>>).reduce(
    (sum, item) => sum + Number(item.stock_value ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70 bg-card/90">
        <CardContent className="relative overflow-hidden px-6 py-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_24%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                <BarChart3 className="size-3.5" />
                Finance cockpit
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Watch cash, receivables, payables, and inventory in one place with quicker jumps into the modules that need attention.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Base currency
                </div>
                <div className="mt-2 text-xl font-semibold">{dashboardCurrency ?? "USD"}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Live modules
                </div>
                <div className="mt-2 text-xl font-semibold">Invoices, bills, journals, inventory</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Cash"
          value={Number(kpis.cash ?? 0)}
          description="Mapped from cash/bank accounts and org account settings"
          currency={dashboardCurrency}
          icon={Wallet}
          accentClassName="from-emerald-500/15 via-emerald-400/5 to-transparent"
        />
        <KpiCard
          title="Revenue MTD"
          value={Number(kpis.revenue_mtd ?? 0)}
          description="Posted income credits"
          currency={dashboardCurrency}
          icon={TrendingUp}
          accentClassName="from-sky-500/15 via-sky-400/5 to-transparent"
        />
        <KpiCard
          title="Expenses MTD"
          value={Number(kpis.expenses_mtd ?? 0)}
          description="Posted expense debits"
          currency={dashboardCurrency}
          icon={TrendingDown}
          accentClassName="from-rose-500/15 via-rose-400/5 to-transparent"
        />
        <KpiCard
          title="AR"
          value={Number(kpis.ar ?? 0)}
          description="Control account balance"
          currency={dashboardCurrency}
          icon={HandCoins}
          accentClassName="from-violet-500/15 via-violet-400/5 to-transparent"
        />
        <KpiCard
          title="AP"
          value={Number(kpis.ap ?? 0)}
          description="Control account balance"
          currency={dashboardCurrency}
          icon={CreditCard}
          accentClassName="from-orange-500/15 via-orange-400/5 to-transparent"
        />
        <KpiCard
          title="Inventory"
          value={inventoryValue}
          description="On-hand stock valued at current purchase price"
          currency={dashboardCurrency}
          icon={Boxes}
          accentClassName="from-amber-500/15 via-yellow-400/5 to-transparent"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Revenue by Period" subtitle="Monthly posted revenue">
          <RevenueAreaChart
            data={normalizedSeries.map((row) => ({ period: row.period, revenue: row.revenue }))}
            currencyCode={dashboardCurrency}
          />
        </ChartCard>
        <ChartCard title="Expenses by Period" subtitle="Monthly posted expenses">
          <ExpensesLineChart
            data={normalizedSeries.map((row) => ({ period: row.period, expenses: row.expenses }))}
            currencyCode={dashboardCurrency}
          />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-sky-600 dark:text-sky-300" />
              Recent invoices
            </CardTitle>
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
                  className="flex items-center justify-between rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {getInvoiceDisplayNumber(invoice.invoice_no, invoice.id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.invoice_date)} | {invoice.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Currency: {String(invoice.currency_code ?? dashboardCurrency ?? "-")}
                    </p>
                  </div>
                  <div className="text-sm">
                    {formatCurrency(
                      Number(invoice.total ?? 0),
                      (invoice.currency_code as string | null | undefined) || dashboardCurrency
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="size-4 text-orange-600 dark:text-orange-300" />
              Bills to approve
            </CardTitle>
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
                  className="flex items-center justify-between rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{bill.bill_no ?? bill.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(bill.bill_date)}</p>
                    <p className="text-xs text-muted-foreground">
                      Currency: {String(bill.currency_code ?? dashboardCurrency ?? "-")}
                    </p>
                  </div>
                  <div className="text-sm">
                    {formatCurrency(
                      Number(bill.total ?? 0),
                      (bill.currency_code as string | null | undefined) || dashboardCurrency
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No draft bills awaiting approval.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-emerald-600 dark:text-emerald-300" />
              Journals pending approval
            </CardTitle>
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
                  className="block rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent"
                >
                  <p className="text-sm font-medium">{journal.journal_no ?? journal.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(journal.entry_date)} | {journal.status}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No approved journals pending post.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Link
          href={`/${orgId}/inventory`}
          className="group rounded-2xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Inventory command
              </div>
              <div className="mt-2 text-lg font-semibold">Inspect products, stock, and images</div>
            </div>
            <Boxes className="size-5 text-amber-600 transition-transform group-hover:translate-x-1 dark:text-amber-300" />
          </div>
        </Link>
        <Link
          href={`/${orgId}/reports`}
          className="group rounded-2xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Reports
              </div>
              <div className="mt-2 text-lg font-semibold">Export financial views fast</div>
            </div>
            <ArrowRight className="size-5 text-sky-600 transition-transform group-hover:translate-x-1 dark:text-sky-300" />
          </div>
        </Link>
        <Link
          href={`/${orgId}/banking/reconciliation`}
          className="group rounded-2xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/30 hover:bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Banking
              </div>
              <div className="mt-2 text-lg font-semibold">Reconcile account activity</div>
            </div>
            <Wallet className="size-5 text-emerald-600 transition-transform group-hover:translate-x-1 dark:text-emerald-300" />
          </div>
        </Link>
      </section>
    </div>
  );
}
