import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "../config";
import { hardenCookie } from "./cookies";

/** Supabase client bound to the request cookies. Server components, server actions and route handlers only. */
export async function createSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, hardenCookie(options));
        } catch {
          // Called from a server component, which cannot write cookies. The proxy refreshes the
          // session on every request, so ignoring this is safe.
        }
      },
    },
  });
}
