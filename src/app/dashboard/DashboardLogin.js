"use client";

import { useState } from "react";
import { Lock, LogIn } from "lucide-react";

export default function DashboardLogin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("غير مصرح");

  async function signIn() {
    if (!email.trim()) {
      setMessage("اكتبي بريد الأدمن أولاً.");
      return;
    }

    const response = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, next: "/dashboard" }),
    });

    setMessage(response.ok ? "أرسلنا رابط الدخول إلى بريدك." : "تعذر إرسال رابط الدخول.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="glass w-full max-w-md rounded-[2rem] p-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pink-100 text-pink-700">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-pink-950">غير مصرح</h1>
        <p className="mt-2 text-sm font-medium leading-7 text-pink-950/65">
          لوحة Glowva تظهر فقط لحساب الأدمن المصرح له.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            dir="ltr"
            placeholder="admin@email.com"
            className="h-12 rounded-2xl border border-pink-100 bg-white/80 px-4 text-left text-pink-950 outline-none focus:border-pink-400"
          />
          <button
            onClick={signIn}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-pink-600 px-5 font-extrabold text-white transition hover:bg-pink-700"
          >
            <LogIn className="h-5 w-5" />
            إرسال رابط الدخول
          </button>
        </div>
        {message && <p className="mt-4 text-sm font-bold text-pink-800">{message}</p>}
      </section>
    </main>
  );
}
