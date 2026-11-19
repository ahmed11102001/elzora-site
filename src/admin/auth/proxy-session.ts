import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminInternalPath, supabaseConfig } from "../config";
import { hardenCookie } from "./cookies";

/**
 * Proxy for the admin host: rewrites "/x" to the internal "/admin/x", refreshes the Supabase session
 * (access tokens expire after about an hour) and adds the security headers every dashboard response needs.
 * Only runs for admin-host requests, so the public site never loads any of this.
 */
export async function handleAdminRequest(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl.clone();
  url.pathname = adminInternalPath(request.nextUrl.pathname);

  let response = NextResponse.rewrite(url, { request });

  const config = supabaseConfig();
  const hasSession = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  if (config && hasSession) {
    const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.rewrite(url, { request });
          for (const { name, value, options } of list)
            response.cookies.set(name, value, hardenCookie(options));
        },
      },
    });
    // getUser() validates the token with Supabase and refreshes it when needed.
    await supabase.auth.getUser();
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
