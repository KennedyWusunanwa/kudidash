"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";

const customerSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  billing_address: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

const vendorSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createCustomerAction(
  input: z.infer<typeof customerSchema>
): Promise<ActionResult> {
  try {
    const parsed = customerSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/invoices", "/invoices/new"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "sales.manage");
    const { error } = await supabase.from("customers").insert({
      org_id: parsed.orgId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      billing_address: parsed.billing_address || null,
      description: parsed.description || null,
      is_active: true,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/invoices", "/invoices/new"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function createVendorAction(
  input: z.infer<typeof vendorSchema>
): Promise<ActionResult> {
  try {
    const parsed = vendorSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/bills", "/bills/new"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "purchases.manage");
    const { error } = await supabase.from("vendors").insert({
      org_id: parsed.orgId,
      name: parsed.name,
      email: parsed.email || null,
      is_active: true,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/bills", "/bills/new"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}
