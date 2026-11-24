import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next") ?? "/dashboard";
  // Only allow same-site relative redirects (never an external URL).
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL("/auth/login?error=callback_failed", requestUrl.origin)
        );
      }
    } catch {
      return NextResponse.redirect(
        new URL("/auth/login?error=callback_failed", requestUrl.origin)
      );
    }
  }

  // Touch cookies() so the route stays dynamic and the session cookies
  // set by the exchange are flushed with the redirect response.
  void cookies();
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
