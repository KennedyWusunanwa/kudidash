import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthSignInForm } from "@/components/forms/auth-sign-in-form";
import { isPublicSignupEnabled } from "@/lib/env";

export default function SignInPage() {
  const allowPublicSignup = isPublicSignupEnabled();

  return (
    <Card className="border-border/80 bg-card/95 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to KudiDash</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading sign-in form...</div>}>
          <AuthSignInForm />
        </Suspense>
        {allowPublicSignup ? (
          <p className="text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Account access is managed by an administrator. Contact your admin for credentials.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
