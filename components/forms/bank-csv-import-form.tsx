"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { importBankTransactionsCsvAction } from "@/lib/actions/banking.actions";
import { Button } from "@/components/ui/button";
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

const schema = z.object({
  bank_account_id: z.string().uuid(),
  csvText: z.string().min(1),
});

type Input = z.infer<typeof schema>;

export function BankCsvImportForm({
  orgId,
  bankAccounts,
}: {
  orgId: string;
  bankAccounts: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank_account_id: bankAccounts[0]?.id ?? "",
      csvText: "date,description,amount,reference\n",
    },
  });

  const onSubmit = (values: Input) => {
    startTransition(async () => {
      const result = await importBankTransactionsCsvAction({ orgId, ...values });
      if (!result.success) {
        toast.error(result.error || "Import failed.");
        return;
      }
      toast.success(`Imported ${result.data?.imported ?? 0} transactions.`);
      form.reset({ ...values, csvText: "date,description,amount,reference\n" });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bank_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank account</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
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
          name="csvText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CSV content</FormLabel>
              <FormControl>
                <Textarea rows={8} className="font-mono text-xs" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Importing..." : "Import transactions"}
        </Button>
      </form>
    </Form>
  );
}

