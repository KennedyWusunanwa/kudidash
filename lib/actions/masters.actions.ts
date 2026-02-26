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

const updateCustomerSchema = customerSchema.extend({
  customerId: z.string().uuid(),
  tax_id: z.string().trim().max(120).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});
const deleteCustomerSchema = z.object({
  orgId: z.string().uuid(),
  customerId: z.string().uuid(),
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
      revalidateOrgPaths(parsed.orgId, ["/customers", "/invoices", "/invoices/new"]);
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
    revalidateOrgPaths(parsed.orgId, ["/customers", "/invoices", "/invoices/new"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function updateCustomerProfileAction(
  input: z.infer<typeof updateCustomerSchema>
): Promise<ActionResult> {
  try {
    const parsed = updateCustomerSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, [
        "/customers",
        `/customers/${parsed.customerId}`,
        "/invoices",
        "/invoices/new",
      ]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");
    const { error } = await supabase
      .from("customers")
      .update({
        name: parsed.name,
        email: parsed.email || null,
        phone: parsed.phone || null,
        billing_address: parsed.billing_address || null,
        description: parsed.description || null,
        tax_id: parsed.tax_id || null,
        is_active: parsed.is_active ?? true,
      })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.customerId);
    if (error) throw error;

    revalidateOrgPaths(parsed.orgId, [
      "/customers",
      `/customers/${parsed.customerId}`,
      "/invoices",
      "/invoices/new",
    ]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function deleteCustomerAction(
  input: z.infer<typeof deleteCustomerSchema>
): Promise<ActionResult> {
  try {
    const parsed = deleteCustomerSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, [
        "/customers",
        `/customers/${parsed.customerId}`,
        "/invoices",
        "/invoices/new",
      ]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");

    const [{ count: invoiceCount, error: invoiceCountError }, { count: receiptCount, error: receiptCountError }] =
      await Promise.all([
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("org_id", parsed.orgId)
          .eq("customer_id", parsed.customerId),
        supabase
          .from("receipts")
          .select("id", { count: "exact", head: true })
          .eq("org_id", parsed.orgId)
          .eq("customer_id", parsed.customerId),
      ]);

    if (invoiceCountError) throw invoiceCountError;
    if (receiptCountError) throw receiptCountError;
    if ((invoiceCount ?? 0) > 0 || (receiptCount ?? 0) > 0) {
      return {
        success: false,
        error:
          "This customer has invoices or receipts and cannot be deleted. Set the customer to inactive instead.",
      };
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.customerId);
    if (error) throw error;

    revalidateOrgPaths(parsed.orgId, [
      "/customers",
      `/customers/${parsed.customerId}`,
      "/invoices",
      "/invoices/new",
    ]);
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
