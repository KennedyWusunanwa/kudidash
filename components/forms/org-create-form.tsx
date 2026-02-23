"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createOrgAction } from "@/lib/actions/org.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const orgFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  base_currency: z.string().length(3).default("GHS"),
});

type OrgFormInput = z.input<typeof orgFormSchema>;

export function OrgCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<OrgFormInput>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: { name: "", slug: "", base_currency: "GHS" },
  });

  const onSubmit = (values: OrgFormInput) => {
    startTransition(async () => {
      const parsed = orgFormSchema.parse(values);
      const result = await createOrgAction(parsed);
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create organization.");
        return;
      }
      toast.success("Organization created.");
      router.push(`/${result.data.orgId}/dashboard`);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input placeholder="KudiDash Ghana Ltd" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="kudidash-ghana" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="base_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base currency</FormLabel>
              <FormControl>
                <Input maxLength={3} placeholder="GHS" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create organization"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

