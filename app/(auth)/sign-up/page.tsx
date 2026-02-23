import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthSignUpForm } from "@/components/forms/auth-sign-up-form";

export default function SignUpPage() {
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
