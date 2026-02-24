"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
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

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type SignInInput = z.infer<typeof signInSchema>;

export function AuthSignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [loadingMagicLink, setLoadingMagicLink] = useState(false);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: SignInInput) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        toast.error(error.message);
        return;
      }
      const next = params.get("next") || "/select-org";
      router.push(next);
      router.refresh();
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
                <Input type="password" autoComplete="current-password" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
          <Button
            type="button"
            variant="outline"
          disabled={loadingMagicLink}
          onClick={async () => {
              const email = form.getValues("email");
              if (!email) {
                toast.error("Enter your email first.");
                return;
              }
              setLoadingMagicLink(true);
              const supabase = createSupabaseBrowserClient();
              const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(
                /\/+$/,
                ""
              );
              const redirectTo = `${baseUrl}/auth/callback`;
              const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
              });
              setLoadingMagicLink(false);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Magic link sent.");
            }}
          >
            {loadingMagicLink ? "Sending..." : "Send magic link"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

