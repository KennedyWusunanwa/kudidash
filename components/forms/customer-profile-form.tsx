"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateCustomerProfileAction } from "@/lib/actions/masters.actions";
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

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  billing_address: z.string().trim().max(500).optional().or(z.literal("")),
  tax_id: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  is_active: z.boolean(),
});

type InputType = z.infer<typeof schema>;

export function CustomerProfileForm({
  orgId,
  customerId,
  initialValues,
  disabled = false,
}: {
  orgId: string;
  customerId: string;
  initialValues: {
    name: string;
    email?: string | null;
    phone?: string | null;
    billing_address?: string | null;
    tax_id?: string | null;
    description?: string | null;
    is_active?: boolean;
  };
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<InputType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues.name ?? "",
      email: initialValues.email ?? "",
      phone: initialValues.phone ?? "",
      billing_address: initialValues.billing_address ?? "",
      tax_id: initialValues.tax_id ?? "",
      description: initialValues.description ?? "",
      is_active: initialValues.is_active !== false,
    },
  });

  const onSubmit = (values: InputType) => {
    startTransition(async () => {
      const parsed = schema.parse(values);
      const result = await updateCustomerProfileAction({
        orgId,
        customerId,
        ...parsed,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to update customer.");
        return;
      }
      toast.success("Customer profile updated.");
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...(field as any)} disabled={disabled || isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={field.value ? "active" : "inactive"}
                onValueChange={(value) => field.onChange(value === "active")}
                disabled={disabled || isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  {...(field as any)}
                  value={field.value ?? ""}
                  disabled={disabled || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  {...(field as any)}
                  value={field.value ?? ""}
                  disabled={disabled || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tax_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax ID</FormLabel>
              <FormControl>
                <Input
                  {...(field as any)}
                  value={field.value ?? ""}
                  disabled={disabled || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billing_address"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Billing address</FormLabel>
              <FormControl>
                <Textarea
                  {...(field as any)}
                  value={field.value ?? ""}
                  rows={3}
                  disabled={disabled || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...(field as any)}
                  value={field.value ?? ""}
                  rows={2}
                  disabled={disabled || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={disabled || isPending}>
            {isPending ? "Saving..." : "Save customer profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
