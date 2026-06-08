import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "./env";

export async function getSupabaseCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Route handlers can.
        }
      },
    },
  });
}

export async function getCookieUser() {
  const supabase = await getSupabaseCookieClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user || null;
}
