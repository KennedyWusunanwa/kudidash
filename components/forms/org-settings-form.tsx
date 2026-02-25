"use client";

import { type ChangeEvent, useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isInvoiceLogoDataUrl(value: string) {
  return /^data:image\/(?:png|jpe?g);base64,[a-z0-9+/=\s]+$/i.test(value);
}

const invoiceLogoSchema = z
  .string()
  .trim()
  .max(1_000_000, "Logo image is too large")
  .refine((value) => !value || isValidHttpUrl(value) || isInvoiceLogoDataUrl(value), {
    message: "Use an HTTP(S) image URL or upload a PNG/JPG logo.",
  });

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read image file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

const orgSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  base_currency: z.string().length(3),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12),
  dashboard_name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  dashboard_logo_url: z.string().url().optional().or(z.literal("")),
  dashboard_color_scheme: z.enum(DASHBOARD_COLOR_SCHEMES),
  invoice_company_name: z.string().trim().max(120).optional().or(z.literal("")),
  invoice_company_address: z.string().trim().max(500).optional().or(z.literal("")),
  invoice_company_phone: z.string().trim().max(60).optional().or(z.literal("")),
  invoice_company_email: z.string().email().max(254).optional().or(z.literal("")),
  invoice_company_tax_id: z.string().trim().max(120).optional().or(z.literal("")),
  invoice_logo_url: invoiceLogoSchema.optional().or(z.literal("")),
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
    invoice_company_name?: string | null;
    invoice_company_address?: string | null;
    invoice_company_phone?: string | null;
    invoice_company_email?: string | null;
    invoice_company_tax_id?: string | null;
    invoice_logo_url?: string | null;
  };
  accountSettings?: Partial<Record<keyof AccountSettingsInput, string | null>>;
  accountOptions: Array<{ id: string; label: string }>;
  canManageOrgSettings: boolean;
}) {
  const [isPendingOrg, startOrgTransition] = useTransition();
  const [isPendingMap, startMapTransition] = useTransition();
  const [isReadingLogoFile, setIsReadingLogoFile] = useState(false);

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
      invoice_company_name: org.invoice_company_name ?? "",
      invoice_company_address: org.invoice_company_address ?? "",
      invoice_company_phone: org.invoice_company_phone ?? "",
      invoice_company_email: org.invoice_company_email ?? "",
      invoice_company_tax_id: org.invoice_company_tax_id ?? "",
      invoice_logo_url: org.invoice_logo_url ?? "",
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

  const invoiceLogoValue = orgForm.watch("invoice_logo_url");

  const handleInvoiceLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Use a PNG or JPG file for invoice logo upload.");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > 500 * 1024) {
      toast.error("Invoice logo must be 500 KB or smaller.");
      event.currentTarget.value = "";
      return;
    }

    setIsReadingLogoFile(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      orgForm.setValue("invoice_logo_url", dataUrl as any, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Invoice logo uploaded. Save settings to apply it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read logo file.");
    } finally {
      setIsReadingLogoFile(false);
      event.currentTarget.value = "";
    }
  };

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
          <div className="md:col-span-2 rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Invoice company details</p>
              <p className="text-xs text-muted-foreground">
                These details appear on downloaded invoice PDFs in the `From` section.
              </p>
            </div>
          </div>
          <FormField
            control={orgForm.control}
            name="invoice_company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name on invoice</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Acme Ltd"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Optional. Defaults to organization name if blank.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="invoice_company_tax_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Tax ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="TIN / VAT ID"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="invoice_company_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="billing@company.com"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="invoice_company_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+233..."
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="invoice_company_address"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Company address</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder={"Street address\nCity, Country"}
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={orgForm.control}
            name="invoice_logo_url"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Invoice logo (URL or upload)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://yourcdn.com/company-logo.png"
                    {...(field as any)}
                    value={field.value ?? ""}
                    disabled={!canManageOrgSettings || isPendingOrg}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Use a public image URL, or upload a PNG/JPG file below (stored directly in
                  settings).
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="invoice-logo-upload">
              Upload invoice logo (PNG/JPG, max 500 KB)
            </label>
            <Input
              id="invoice-logo-upload"
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleInvoiceLogoUpload}
              disabled={!canManageOrgSettings || isPendingOrg || isReadingLogoFile}
            />
            <div className="flex flex-wrap items-center gap-3">
              {invoiceLogoValue ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invoiceLogoValue}
                  alt="Invoice logo preview"
                  className="h-12 w-auto max-w-40 rounded border bg-white object-contain p-1"
                />
              ) : (
                <p className="text-xs text-muted-foreground">No invoice logo selected.</p>
              )}
              {invoiceLogoValue ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    orgForm.setValue("invoice_logo_url", "" as any, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  disabled={!canManageOrgSettings || isPendingOrg}
                >
                  Clear invoice logo
                </Button>
              ) : null}
              {isReadingLogoFile ? (
                <p className="text-xs text-muted-foreground">Reading logo file...</p>
              ) : null}
            </div>
          </div>
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
              <Button type="submit" disabled={isPendingOrg || isReadingLogoFile}>
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

