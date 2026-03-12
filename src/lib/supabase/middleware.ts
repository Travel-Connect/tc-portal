import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const perfEnabled =
  process.env.NEXT_PUBLIC_DEBUG_PERF === "1" ||
  process.env.NODE_ENV === "development";

export async function updateSession(request: NextRequest) {
  const mwStart = perfEnabled ? performance.now() : 0;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const authStart = perfEnabled ? performance.now() : 0;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (perfEnabled) {
    const authMs = performance.now() - authStart;
    console.log(`[PERF] middleware | auth.getUser: ${authMs.toFixed(1)}ms | path=${request.nextUrl.pathname}`);
  }

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthCallback = request.nextUrl.pathname === "/auth/callback";
  const isRunnerApi = request.nextUrl.pathname.startsWith("/api/runner/");
  const isRunsCallbackApi = request.nextUrl.pathname === "/api/runs/callback";
  const isMonitorApi = request.nextUrl.pathname.startsWith("/api/monitor/");
  const isWebhookApi = request.nextUrl.pathname.startsWith("/api/announcements/webhook");

  // Allow auth callback
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Allow Runner API, runs callback, monitor API, and webhook API (uses custom authentication)
  if (isRunnerApi || isRunsCallbackApi || isMonitorApi || isWebhookApi) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Note: /admin routes are now open to all authenticated users
  // Tool management and category management are available to everyone
  // Other admin features (announcements, incidents, users) are still "準備中"

  if (perfEnabled) {
    const totalMs = performance.now() - mwStart;
    console.log(`[PERF] middleware | total: ${totalMs.toFixed(1)}ms | path=${request.nextUrl.pathname}`);
  }

  return supabaseResponse;
}
