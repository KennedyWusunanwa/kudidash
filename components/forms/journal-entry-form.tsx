"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDraftJournalAction } from "@/lib/actions/journals.actions";
import { journalEntrySchema } from "@/lib/validators/journal";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountOption {
  id: string;
  label: string;
}

const today = new Date().toISOString().slice(0, 10);

export function JournalEntryForm({
  orgId,
  accountOptions,
}: {
  orgId: string;
  accountOptions: AccountOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entry_date: today,
      memo: "",
      reference: "",
      lines: [
        {
          account_id: accountOptions[0]?.id ?? "",
          description: "",
          debit: 0,
          credit: 0,
        },
        {
          account_id: accountOptions[1]?.id ?? accountOptions[0]?.id ?? "",
          description: "",
          debit: 0,
          credit: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = useWatch({ control: form.control, name: "lines" });
  const totals = useMemo(() => {
    const debit = (watchedLines ?? []).reduce((sum, line) => sum + Number(line?.debit ?? 0), 0);
    const credit = (watchedLines ?? []).reduce(
      (sum, line) => sum + Number(line?.credit ?? 0),
      0
    );
    return { debit: Number(debit.toFixed(2)), credit: Number(credit.toFixed(2)) };
  }, [watchedLines]);

  const onSubmit = (values: unknown) => {
    startTransition(async () => {
      const parsed = journalEntrySchema.parse(values);
      const result = await createDraftJournalAction({ orgId, ...parsed });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create journal.");
        return;
      }
      toast.success("Draft journal created.");
      router.push(`/${orgId}/journals/${result.data.journalId}`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Journal Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry date</FormLabel>
                    <FormControl>
                      <Input type="date" {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="JV-2026-001" {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo</FormLabel>
                    <FormControl>
                      <Input placeholder="Month-end accrual" {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Lines</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      account_id: accountOptions[0]?.id ?? "",
                      description: "",
                      debit: 0,
                      credit: 0,
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add line
                </Button>
              </div>

              <div className="hidden rounded-lg border md:block">
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Account</span>
                  <span>Description</span>
                  <span>Debit</span>
                  <span>Credit</span>
                  <span>Action</span>
                </div>
                <div className="space-y-2 p-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2"
                    >
                      <FormField
                        control={form.control}
                        name={`lines.${index}.account_id`}
                        render={({ field }) => (
                          <FormItem>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accountOptions.map((account) => (
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
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Line memo" {...(field as any)} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${index}.debit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...(field as any)}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lines.${index}.credit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...(field as any)}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete line ${index + 1}`}
                          onClick={() => fields.length > 2 && remove(index)}
                          disabled={fields.length <= 2}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Line {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fields.length > 2 && remove(index)}
                        disabled={fields.length <= 2}
                        aria-label={`Delete line ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.account_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accountOptions.map((account) => (
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
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...(field as any)} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.debit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Debit</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...(field as any)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`lines.${index}.credit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Credit</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...(field as any)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                <span>Total Debit: {totals.debit.toFixed(2)}</span>
                <span>Total Credit: {totals.credit.toFixed(2)}</span>
                <span
                  className={
                    totals.debit === totals.credit ? "text-emerald-600" : "text-destructive"
                  }
                >
                  {totals.debit === totals.credit ? "Balanced" : "Out of balance"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create draft journal"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

