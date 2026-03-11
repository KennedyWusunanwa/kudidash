"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createSupabaseBrowserClient, getSupabaseBrowserConfigIssue } from "@/lib/supabase/browser";
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

const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignUpInput = z.infer<typeof signUpSchema>;

export function AuthSignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (values: SignUpInput) => {
    startTransition(async () => {
      try {
        const configIssue = getSupabaseBrowserConfigIssue();
        if (configIssue) {
          toast.error(configIssue);
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const baseUrl = (window.location.origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
          /\/+$/,
          ""
        );
        const redirectTo = `${baseUrl}/auth/callback`;
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created. Check email if confirmation is enabled.");
        router.push("/sign-in");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sign-up failed.");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </Form>
  );
}

