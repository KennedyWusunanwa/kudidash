import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isDemoMode } from "@/lib/env";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/callback"];

export async function middleware(req: NextRequest) {
  if (isDemoMode()) {
    // Demo mode: Supabase is unavailable, so skip session refresh/auth enforcement.
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) {
            res.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  // Refresh session if needed
  const { data } = await supabase.auth.getUser();
  const isAuthed = !!data?.user;

  const pathname = req.nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isPublic) {
    // Protect all non-public routes; adjust if you add more public pages
    if (!isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
