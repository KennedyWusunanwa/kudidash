import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthSignUpForm } from "@/components/forms/auth-sign-up-form";
import { isPublicSignupEnabled } from "@/lib/env";

export default function SignUpPage() {
  if (!isPublicSignupEnabled()) {
    return (
      <Card className="border-border/80 bg-card/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Self sign-up is disabled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accounts are created by your KudiDash administrator. Contact an admin to get your
            email and password.
          </p>
          <p className="text-sm text-muted-foreground">
            Already have credentials?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card/95 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create your KudiDash account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthSignUpForm />
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
