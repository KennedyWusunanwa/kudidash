"use server";

import { z } from "zod";
import { getDemoBalanceSheet, getDemoPnl, getDemoTrialBalance } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
} from "@/lib/actions/_helpers";

const trialBalanceSchema = z.object({
  orgId: z.string().uuid(),
  endDate: z.string().date(),
});

const pnlSchema = z.object({
  orgId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

const balanceSheetSchema = z.object({
  orgId: z.string().uuid(),
  endDate: z.string().date(),
});

export async function trialBalanceAction(
  input: z.infer<typeof trialBalanceSchema>
): Promise<ActionResult<unknown[]>> {
  try {
    const parsed = trialBalanceSchema.parse(input);
    if (isDemoMode()) {
      return { success: true, data: getDemoTrialBalance() };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "reports.view");
    const { data, error } = await supabase.rpc("kd_trial_balance", {
      p_org_id: parsed.orgId,
      p_end_date: parsed.endDate,
    });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function pnlAction(
  input: z.infer<typeof pnlSchema>
): Promise<ActionResult<unknown[]>> {
  try {
    const parsed = pnlSchema.parse(input);
    if (isDemoMode()) {
      return { success: true, data: getDemoPnl() };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "reports.view");
    const { data, error } = await supabase.rpc("kd_profit_and_loss", {
      p_org_id: parsed.orgId,
      p_start_date: parsed.startDate,
      p_end_date: parsed.endDate,
    });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function balanceSheetAction(
  input: z.infer<typeof balanceSheetSchema>
): Promise<ActionResult<unknown[]>> {
  try {
    const parsed = balanceSheetSchema.parse(input);
    if (isDemoMode()) {
      return { success: true, data: getDemoBalanceSheet() };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "reports.view");
    const { data, error } = await supabase.rpc("kd_balance_sheet", {
      p_org_id: parsed.orgId,
      p_end_date: parsed.endDate,
    });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
