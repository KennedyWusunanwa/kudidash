"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { accountSchema } from "@/lib/validators/account";
import { createAccountAction, updateAccountAction } from "@/lib/actions/coa.actions";
import type { Account } from "@/types/accounting";
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

type AccountFormValues = z.input<typeof accountSchema>;

const accountTypes = ["asset", "liability", "equity", "income", "expense"] as const;
const subTypes = [
  "bank",
  "cash",
  "accounts_receivable",
  "inventory",
  "fixed_asset",
  "accounts_payable",
  "tax",
  "equity",
  "sales",
  "cost_of_sales",
  "operating_expense",
  "other",
] as const;

export function AccountForm({
  orgId,
  account,
  onSuccess,
}: {
  orgId: string;
  account?: Partial<Account> | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: account?.code ?? "",
      name: account?.name ?? "",
      type: (account?.type as AccountFormValues["type"]) ?? "asset",
      sub_type: (account?.sub_type as AccountFormValues["sub_type"]) ?? "other",
      currency_code: account?.currency_code ?? "GHS",
      is_active: account?.is_active ?? true,
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    startTransition(async () => {
      const parsedValues = accountSchema.parse(values);
      const result = account?.id
        ? await updateAccountAction({ orgId, id: account.id, ...parsedValues })
        : await createAccountAction({ orgId, ...parsedValues });

      if (!result.success) {
        toast.error(result.error || "Failed to save account.");
        return;
      }
      toast.success(account?.id ? "Account updated." : "Account created.");
      onSuccess?.();
      if (!account?.id) {
        form.reset({ ...values, code: "", name: "" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="1000" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Cash at Bank" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sub_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtype</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency_code"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input maxLength={3} {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : account?.id ? "Update account" : "Create account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

