"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateOrgAccountSettingsAction,
  updateOrgSettingsAction,
} from "@/lib/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const orgSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  base_currency: z.string().length(3),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12),
});

const accountSettingsSchema = z.object({
  ar_account_id: z.string().optional(),
  ap_account_id: z.string().optional(),
  cash_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  retained_earnings_account_id: z.string().optional(),
  revenue_default_account_id: z.string().optional(),
  expense_default_account_id: z.string().optional(),
});

type OrgSettingsInput = z.input<typeof orgSettingsSchema>;
type AccountSettingsInput = z.input<typeof accountSettingsSchema>;

export function OrgSettingsForm({
  orgId,
  org,
  accountSettings,
  accountOptions,
}: {
  orgId: string;
  org: { name: string; base_currency: string; fiscal_year_start_month?: number | null };
  accountSettings?: Partial<Record<keyof AccountSettingsInput, string | null>>;
  accountOptions: Array<{ id: string; label: string }>;
}) {
  const [isPendingOrg, startOrgTransition] = useTransition();
  const [isPendingMap, startMapTransition] = useTransition();

  const orgForm = useForm<OrgSettingsInput>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: org.name ?? "",
      base_currency: org.base_currency ?? "GHS",
      fiscal_year_start_month: org.fiscal_year_start_month ?? 1,
    },
  });

  const mapForm = useForm<AccountSettingsInput>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      ar_account_id: accountSettings?.ar_account_id ?? "",
      ap_account_id: accountSettings?.ap_account_id ?? "",
      cash_account_id: accountSettings?.cash_account_id ?? "",
      bank_account_id: accountSettings?.bank_account_id ?? "",
      retained_earnings_account_id: accountSettings?.retained_earnings_account_id ?? "",
      revenue_default_account_id: accountSettings?.revenue_default_account_id ?? "",
      expense_default_account_id: accountSettings?.expense_default_account_id ?? "",
    },
  });

  const saveOrg = (values: OrgSettingsInput) => {
    startOrgTransition(async () => {
      const parsed = orgSettingsSchema.parse(values);
      const result = await updateOrgSettingsAction({ orgId, ...parsed });
      if (!result.success) {
        toast.error(result.error || "Failed to update org settings.");
        return;
      }
      toast.success("Organization settings saved.");
    });
  };

  const saveMappings = (values: AccountSettingsInput) => {
    startMapTransition(async () => {
      const parsedInput = accountSettingsSchema.parse(values);
      const normalize = (value?: string) => (value ? value : null);
      const result = await updateOrgAccountSettingsAction({
        orgId,
        ar_account_id: normalize(parsedInput.ar_account_id),
        ap_account_id: normalize(parsedInput.ap_account_id),
        cash_account_id: normalize(parsedInput.cash_account_id),
        bank_account_id: normalize(parsedInput.bank_account_id),
        retained_earnings_account_id: normalize(parsedInput.retained_earnings_account_id),
        revenue_default_account_id: normalize(parsedInput.revenue_default_account_id),
        expense_default_account_id: normalize(parsedInput.expense_default_account_id),
      });
      if (!result.success) {
        toast.error(result.error || "Failed to update account mappings.");
        return;
      }
      toast.success("Control account mappings saved.");
    });
  };

  const mapFields: Array<{ name: keyof AccountSettingsInput; label: string }> = [
    { name: "ar_account_id", label: "Accounts Receivable control" },
    { name: "ap_account_id", label: "Accounts Payable control" },
    { name: "cash_account_id", label: "Cash control" },
    { name: "bank_account_id", label: "Bank control" },
    { name: "retained_earnings_account_id", label: "Retained Earnings" },
    { name: "revenue_default_account_id", label: "Default Revenue account" },
    { name: "expense_default_account_id", label: "Default Expense account" },
  ];

  return (
    <div className="space-y-6">
      <Form {...orgForm}>
        <form onSubmit={orgForm.handleSubmit(saveOrg)} className="grid gap-4 md:grid-cols-2">
          <FormField
            control={orgForm.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Organization name</FormLabel>
                <FormControl>
                  <Input {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="base_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base currency</FormLabel>
                <FormControl>
                  <Input maxLength={3} {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="fiscal_year_start_month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal year start month</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={12} {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPendingOrg}>
              {isPendingOrg ? "Saving..." : "Save organization settings"}
            </Button>
          </div>
        </form>
      </Form>

      <Form {...mapForm}>
        <form onSubmit={mapForm.handleSubmit(saveMappings)} className="grid gap-4 md:grid-cols-2">
          {mapFields.map(({ name, label }) => (
            <FormField
              key={name}
              control={mapForm.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Unmapped</SelectItem>
                      {accountOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isPendingMap}>
              {isPendingMap ? "Saving..." : "Save control account mappings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

