import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthSignInForm } from "@/components/forms/auth-sign-in-form";

export default function SignInPage() {
  return (
    <Card className="border-border/80 bg-card/95 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to KudiDash</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading sign-in form...</div>}>
          <AuthSignInForm />
        </Suspense>
        <p className="text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
