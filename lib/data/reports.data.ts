import { formatISO, startOfMonth } from "date-fns";
import {
  getDemoBalanceSheet,
  getDemoDashboardKpis,
  getDemoMonthlyPerformance,
  getDemoPnl,
  getDemoTrialBalance,
} from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDashboardKpis(orgId: string, asOf = new Date()) {
  if (isDemoMode()) {
    return getDemoDashboardKpis();
  }

  const supabase = createSupabaseServerClient();
  const monthStart = formatISO(startOfMonth(asOf), { representation: "date" });
  const asOfDate = formatISO(asOf, { representation: "date" });

  const { data, error } = await supabase.rpc("kd_dashboard_kpis", {
    p_org_id: orgId,
    p_start_date: monthStart,
    p_end_date: asOfDate,
  });

  if (error) {
    return {
      cash: 0,
      revenue_mtd: 0,
      expenses_mtd: 0,
      ar: 0,
      ap: 0,
      note: "Dashboard KPI RPC unavailable; using zeros.",
    };
  }

  return Array.isArray(data) ? (data[0] ?? {}) : data;
}

export async function getRevenueExpenseSeries(orgId: string, months = 6) {
  if (isDemoMode()) {
    return getDemoMonthlyPerformance().slice(-Math.max(months, 1));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_monthly_performance", {
    p_org_id: orgId,
    p_months: months,
  });
  if (error) return [];
  return data ?? [];
}

export async function getTrialBalance(orgId: string, endDate: string) {
  if (isDemoMode()) {
    return getDemoTrialBalance();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_trial_balance", {
    p_org_id: orgId,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getProfitAndLoss(
  orgId: string,
  startDate: string,
  endDate: string
) {
  if (isDemoMode()) {
    return getDemoPnl();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_profit_and_loss", {
    p_org_id: orgId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getBalanceSheet(orgId: string, endDate: string) {
  if (isDemoMode()) {
    return getDemoBalanceSheet();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("kd_balance_sheet", {
    p_org_id: orgId,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data ?? [];
}
