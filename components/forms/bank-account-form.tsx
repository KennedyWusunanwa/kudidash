"use client";

import { useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBankAccountAction } from "@/lib/actions/banking.actions";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
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

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  account_number_masked: z.string().trim().max(32).optional().or(z.literal("")),
  currency_code: z.string().length(3).default("GHS"),
  gl_account_id: z.string().uuid(),
});

type InputType = z.input<typeof schema>;

export function BankAccountForm({
  orgId,
  glAccounts,
}: {
  orgId: string;
  glAccounts: Array<{ id: string; label: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<InputType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      account_number_masked: "",
      currency_code: DEFAULT_CURRENCY_CODE,
      gl_account_id: glAccounts[0]?.id ?? "",
    },
  });

  const onSubmit = (values: InputType) => {
    startTransition(async () => {
      const parsed = schema.parse(values);
      const result = await createBankAccountAction({ orgId, ...parsed });
      if (!result.success) {
        toast.error(result.error || "Failed to create bank account.");
        return;
      }
      toast.success("Bank account created.");
      form.reset({ ...values, name: "", account_number_masked: "" });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Main GHS Bank" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="account_number_masked"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Masked acct no.</FormLabel>
              <FormControl>
                <Input placeholder="****1234" {...(field as any)} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
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
          control={form.control}
          name="gl_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GL account</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {glAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create bank account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

