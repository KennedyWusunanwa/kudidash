"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCustomerAction } from "@/lib/actions/masters.actions";
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

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal("")),
});

type InputType = z.infer<typeof schema>;

export function CustomerForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<InputType>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = (values: InputType) => {
    startTransition(async () => {
      const result = await createCustomerAction({ orgId, ...values });
      if (!result.success) {
        toast.error(result.error || "Failed to create customer.");
        return;
      }
      toast.success("Customer created.");
      form.reset();
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer name</FormLabel>
              <FormControl>
                <Input {...(field as any)} />
              </FormControl>
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
                <Input type="email" {...(field as any)} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

