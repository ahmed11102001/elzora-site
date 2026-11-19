// Session cookie hardening. The browser never talks to Supabase: all auth runs in server actions and
// the proxy, so the session cookies can be httpOnly (invisible to page scripts) and Secure.
export function hardenCookie<T extends Record<string, unknown>>(options: T | undefined) {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
