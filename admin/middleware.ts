/**
 * Session refresh + auth gate: unauthenticated users are redirected to
 * /login for every panel route. Admin-ness (admin_users membership) is
 * checked in the panel layout via rpc('is_admin') — this middleware only
 * guarantees a session exists and keeps its cookies fresh.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without env vars createServerClient throws, and an uncaught throw in
  // middleware becomes an opaque MIDDLEWARE_INVOCATION_FAILED 500 for EVERY
  // route. Let the request through instead — the pages render a readable
  // setup message (nothing is exposed: no client = no data).
  if (!supabaseConfigured()) return response;

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // A transient Supabase/network error must not 500 the whole site either.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return response; // unknown auth state — let the page handle it
  }

  const isLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // everything except static assets and the upload API's own auth handling
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
