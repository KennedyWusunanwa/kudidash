"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { startReconciliationAction } from "@/lib/actions/banking.actions";
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
  bank_account_id: z.string().uuid(),
  statement_start_date: z.string().date(),
  statement_end_date: z.string().date(),
  statement_ending_balance: z.coerce.number().finite(),
});

type InputType = z.input<typeof schema>;

export function ReconciliationSessionForm({
  orgId,
  bankAccounts,
}: {
  orgId: string;
  bankAccounts: Array<{ id: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<InputType>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank_account_id: bankAccounts[0]?.id ?? "",
      statement_start_date: today,
      statement_end_date: today,
      statement_ending_balance: 0,
    },
  });

  const onSubmit = (values: InputType) => {
    startTransition(async () => {
      const parsed = schema.parse(values);
      const result = await startReconciliationAction({ orgId, ...parsed });
      if (!result.success) {
        toast.error(result.error || "Failed to start reconciliation.");
        return;
      }
      toast.success("Reconciliation session created.");
      form.reset({ ...values });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="bank_account_id"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
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
          name="statement_start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statement start</FormLabel>
              <FormControl>
                <Input type="date" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="statement_end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statement end</FormLabel>
              <FormControl>
                <Input type="date" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="statement_ending_balance"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Ending balance</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Start reconciliation"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

