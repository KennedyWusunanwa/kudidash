import type { ReactNode } from "react";
import { getUserOrRedirect } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getUserOrRedirect();
  return <>{children}</>;
}
