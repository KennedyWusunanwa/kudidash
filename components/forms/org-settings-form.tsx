"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DASHBOARD_COLOR_SCHEMES } from "@/lib/branding";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
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
  dashboard_name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  dashboard_logo_url: z.string().url().optional().or(z.literal("")),
  dashboard_color_scheme: z.enum(DASHBOARD_COLOR_SCHEMES),
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
const UNMAPPED_VALUE = "__unmapped__";

export function OrgSettingsForm({
  orgId,
  org,
  accountSettings,
  accountOptions,
  canManageOrgSettings,
}: {
  orgId: string;
  org: {
    name: string;
    base_currency: string;
    fiscal_year_start_month?: number | null;
    dashboard_name?: string | null;
    dashboard_logo_url?: string | null;
    dashboard_color_scheme?: string | null;
  };
  accountSettings?: Partial<Record<keyof AccountSettingsInput, string | null>>;
  accountOptions: Array<{ id: string; label: string }>;
  canManageOrgSettings: boolean;
}) {
  const [isPendingOrg, startOrgTransition] = useTransition();
  const [isPendingMap, startMapTransition] = useTransition();

  const orgForm = useForm<OrgSettingsInput>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: org.name ?? "",
      base_currency: org.base_currency ?? DEFAULT_CURRENCY_CODE,
      fiscal_year_start_month: org.fiscal_year_start_month ?? 1,
      dashboard_name: org.dashboard_name ?? "",
      dashboard_logo_url: org.dashboard_logo_url ?? "",
      dashboard_color_scheme:
        (DASHBOARD_COLOR_SCHEMES as readonly string[]).includes(org.dashboard_color_scheme ?? "")
          ? ((org.dashboard_color_scheme ?? "default") as any)
          : "default",
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
                  <Input {...(field as any)} disabled={!canManageOrgSettings || isPendingOrg} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="dashboard_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dashboard display name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="KudiDash"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  This name appears in the dashboard shell navigation.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="dashboard_color_scheme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dashboard color scheme</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManageOrgSettings || isPendingOrg}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select color scheme" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DASHBOARD_COLOR_SCHEMES.map((scheme) => (
                      <SelectItem key={scheme} value={scheme}>
                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="dashboard_logo_url"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Dashboard logo URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://yourcdn.com/logo.png"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Public HTTPS image URL used in the sidebar/topbar branding.
                </p>
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManageOrgSettings || isPendingOrg}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    {...(field as any)}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:col-span-2">
            {canManageOrgSettings ? (
              <Button type="submit" disabled={isPendingOrg}>
                {isPendingOrg ? "Saving..." : "Save organization settings"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only organization `owner` and `admin` roles can update branding and organization
                settings.
              </p>
            )}
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
                  <Select
                    value={field.value || UNMAPPED_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === UNMAPPED_VALUE ? "" : value)
                    }
                    disabled={!canManageOrgSettings || isPendingMap}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNMAPPED_VALUE}>Unmapped</SelectItem>
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
            {canManageOrgSettings ? (
              <Button type="submit" disabled={isPendingMap}>
                {isPendingMap ? "Saving..." : "Save control account mappings"}
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
}

