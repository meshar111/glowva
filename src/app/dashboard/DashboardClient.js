"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Crown, Loader2, Search, Sparkles, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const cards = [
  { key: "visits", label: "إجمالي الزيارات", icon: BarChart3 },
  { key: "searches", label: "عمليات البحث", icon: Search },
  { key: "users", label: "المستخدمون", icon: Users },
  { key: "subscribers", label: "المشتركون", icon: Crown },
];

function rowLabel(row) {
  return row.product_name || row.country || row.city || row.label || row.step || row.name || "غير معروف";
}

function rowValue(row) {
  return row.search_count || row.count || row.total || row.value || row.visits || row.searches || 0;
}

function dailyRows(rows = []) {
  return rows.map((row) => ({
    date: row.day || row.date || row.created_date || row.label || "",
    searches: row.search_count || row.count || row.searches || row.total || 0,
  }));
}

export default function DashboardClient() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const dailyData = useMemo(() => dailyRows(stats?.dailySearches), [stats]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر تحميل الإحصائيات.");
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error.message);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="glass w-full max-w-md rounded-[2rem] p-6 text-center">
          <h1 className="text-2xl font-extrabold text-pink-950">تعذر تحميل الإحصائيات</h1>
          <p className="mt-3 text-sm font-bold text-pink-800">{message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 soft-ring">
            <Sparkles className="h-6 w-6 text-pink-600" />
          </span>
          <div>
            <h1 className="glowva-gradient text-4xl font-extrabold tracking-normal">Glowva Dashboard</h1>
            <p className="mt-1 text-sm font-bold text-pink-950/60">لوحة الأداء والبحث والاشتراكات</p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.key} className="glass rounded-3xl p-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-pink-950/60">{card.label}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-100 text-pink-700">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="text-4xl font-extrabold text-pink-950">{stats?.totals?.[card.key] ?? 0}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="glass rounded-[2rem] p-5">
            <h2 className="mb-4 text-xl font-extrabold text-pink-950">البحث اليومي</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid stroke="#f9a8d4" strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#831843" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#831843" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="searches" stroke="#db2777" fill="#fbcfe8" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
          <ListPanel title="القمع" rows={stats?.funnel || []} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <ListPanel title="أكثر المنتجات" rows={stats?.topProducts || []} />
          <ListPanel title="الدول" rows={stats?.countries || []} />
          <ListPanel title="المدن" rows={stats?.cities || []} />
        </section>
      </div>
    </main>
  );
}

function ListPanel({ title, rows }) {
  return (
    <article className="glass rounded-[2rem] p-5">
      <h2 className="mb-4 text-xl font-extrabold text-pink-950">{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white/60 p-4 text-sm font-bold text-pink-950/50">لا توجد بيانات بعد.</p>
        ) : (
          rows.map((row, index) => (
            <div key={`${rowLabel(row)}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/70 p-3">
              <span className="truncate text-sm font-extrabold text-pink-950">{rowLabel(row)}</span>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-black text-pink-700">{rowValue(row)}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
