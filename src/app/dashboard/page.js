"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Crown, Loader2, Lock, LogIn, Search, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const cards = [
  { key: "visits", label: "إجمالي الزيارات", icon: BarChart3 },
  { key: "searches", label: "عمليات البحث", icon: Search },
  { key: "users", label: "المستخدمون", icon: Users },
  { key: "subscribers", label: "المشتركون", icon: Crown },
];

function getLabel(row, fallback = "غير معروف") {
  return row.product_name || row.country || row.city || row.label || row.step || row.name || fallback;
}

function getValue(row) {
  return row.search_count || row.count || row.total || row.value || row.visits || row.searches || 0;
}

function normalizeDaily(rows) {
  return rows.map((row) => ({
    date: row.day || row.date || row.created_date || row.label || "",
    searches: row.search_count || row.count || row.searches || row.total || 0,
  }));
}

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const dailyData = useMemo(() => normalizeDaily(stats?.dailySearches || []), [stats]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStats(null);
      setStatus(nextSession ? "loading" : "unauthorized");
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setStatus("unauthorized");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch("/api/admin/stats", { headers: { authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "غير مصرّح");
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatus("ready");
        }
      })
      .catch((statsError) => {
        if (!cancelled) {
          setError(statsError.message);
          setStatus("unauthorized");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signIn() {
    setAuthMessage("");
    if (!email.trim()) {
      setAuthMessage("اكتبي بريد الأدمن أولاً.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setAuthMessage(signInError ? "تعذر إرسال رابط الدخول." : "أرسلنا رابط الدخول إلى بريدك.");
  }

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass flex items-center gap-3 rounded-3xl p-6 text-pink-950">
          <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
          <span className="font-extrabold">جاري تحميل لوحة Glowva...</span>
        </div>
      </main>
    );
  }

  if (status === "unauthorized") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="glass w-full max-w-md rounded-[2rem] p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pink-100 text-pink-700">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-pink-950">غير مصرّح</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-pink-950/65">لوحة Glowva تظهر فقط لحساب الأدمن المصرّح له.</p>
          <div className="mt-5 flex flex-col gap-3">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" dir="ltr" placeholder="admin@email.com" className="h-12 rounded-2xl border border-pink-100 bg-white/80 px-4 text-left text-pink-950 outline-none focus:border-pink-400" />
            <button onClick={signIn} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-pink-600 px-5 font-extrabold text-white transition hover:bg-pink-700">
              <LogIn className="h-5 w-5" />
              إرسال رابط الدخول
            </button>
          </div>
          {(authMessage || error) && <p className="mt-4 text-sm font-bold text-pink-800">{authMessage || error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 soft-ring"><Sparkles className="h-6 w-6 text-pink-600" /></span>
          <div><h1 className="glowva-gradient text-4xl font-extrabold tracking-normal">Glowva Dashboard</h1><p className="mt-1 text-sm font-bold text-pink-950/60">لوحة الأداء والبحث والاشتراكات</p></div>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => { const Icon = card.icon; return <article key={card.key} className="glass rounded-3xl p-5"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-extrabold text-pink-950/60">{card.label}</span><span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-100 text-pink-700"><Icon className="h-5 w-5" /></span></div><p className="text-4xl font-extrabold text-pink-950">{stats?.totals?.[card.key] ?? 0}</p></article>; })}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><article className="glass rounded-[2rem] p-5"><h2 className="mb-4 text-xl font-extrabold text-pink-950">البحث اليومي</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyData}><CartesianGrid stroke="#f9a8d4" strokeDasharray="3 3" opacity={0.35} /><XAxis dataKey="date" tick={{ fontSize: 12, fill: "#831843" }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#831843" }} /><Tooltip /><Area type="monotone" dataKey="searches" stroke="#db2777" fill="#f9a8d4" strokeWidth={3} /></AreaChart></ResponsiveContainer></div></article><ListPanel title="القمع" rows={stats?.funnel || []} empty="لا توجد بيانات قمع بعد." /></section>
        <section className="grid gap-6 lg:grid-cols-3"><ListPanel title="أكثر المنتجات" rows={stats?.topProducts || []} /><ListPanel title="الدول" rows={stats?.countries || []} /><ListPanel title="المدن" rows={stats?.cities || []} /></section>
      </div>
    </main>
  );
}

function ListPanel({ title, rows, empty = "لا توجد بيانات بعد." }) {
  return <article className="glass rounded-[2rem] p-5"><h2 className="mb-4 text-xl font-extrabold text-pink-950">{title}</h2><div className="grid gap-3">{rows.length ? rows.map((row, index) => <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"><span className="truncate font-extrabold text-pink-950">{getLabel(row)}</span><span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-extrabold text-pink-700">{getValue(row)}</span></div>) : <p className="rounded-2xl bg-white/55 p-4 text-sm font-bold text-pink-950/60">{empty}</p>}</div></article>;
}
