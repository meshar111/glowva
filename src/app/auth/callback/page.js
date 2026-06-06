"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("جاري تسجيل الدخول...");

  useEffect(() => {
    async function finishAuth() {
      const supabase = getSupabaseBrowserClient();
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const next = params.get("next") || "/dashboard";
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("لم يتم العثور على جلسة دخول.");
        }

        window.location.replace(next);
      } catch (error) {
        setMessage(error.message || "تعذر تسجيل الدخول. جربي إرسال الرابط مرة ثانية.");
      }
    }

    finishAuth();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass flex items-center gap-3 rounded-3xl p-6 text-pink-950">
        <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
        <span className="font-extrabold">{message}</span>
      </div>
    </main>
  );
}
