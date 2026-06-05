"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Crown,
  Download,
  Loader2,
  LogIn,
  LogOut,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Upload,
  WandSparkles,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const ANON_LIMIT = 5;
const AUTH_LIMIT = 20;

function getCount(key) {
  if (typeof window === "undefined") return 0;
  return Number.parseInt(window.localStorage.getItem(key) || "0", 10);
}

function setCount(key, value) {
  window.localStorage.setItem(key, String(value));
}

function normalizeTrendName(item) {
  return item.product_name || item.name || item.product || item.query || "منتج رائج";
}

export default function Home() {
  const [mode, setMode] = useState("name");
  const [query, setQuery] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trending, setTrending] = useState([]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showSubscribeGate, setShowSubscribeGate] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const fileInputRef = useRef(null);

  const attemptKey = session?.user?.id ? `glowva_user_attempts_${session.user.id}` : "glowva_anon_attempts";
  const limit = session?.user ? AUTH_LIMIT : ANON_LIMIT;
  const isSubscribed = Boolean(profile?.is_subscribed);
  const remaining = isSubscribed ? "مفتوحة" : Math.max(limit - attempts, 0);

  useEffect(() => {
    setAttempts(getCount(attemptKey));
  }, [attemptKey, result]);

  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname }),
    }).catch(() => {});

    fetch("/api/trending")
      .then((response) => response.json())
      .then((data) => setTrending(data.products || []))
      .catch(() => setTrending([]));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setShowAuthGate(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase
      .from("profiles")
      .select("is_subscribed, plan")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data || { is_subscribed: false, plan: "free" }));
  }, [session]);

  async function handleImage(file) {
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageData(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function signIn() {
    setAuthMessage("");
    if (!email.trim()) {
      setAuthMessage("اكتبي بريدك أولًا.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    setAuthMessage(authError ? "تعذر إرسال رابط الدخول." : "أرسلنا رابط الدخول إلى بريدك.");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function analyze() {
    setError("");
    setResult(null);
    setShowAuthGate(false);
    setShowSubscribeGate(false);

    if (mode === "name" && !query.trim()) {
      setError("اكتبي اسم المنتج.");
      return;
    }

    if (mode === "photo" && !imageData) {
      setError("ارفعي صورة المنتج.");
      return;
    }

    const currentAttempts = getCount(attemptKey);
    if (!session?.user && currentAttempts >= ANON_LIMIT) {
      setShowAuthGate(true);
      return;
    }

    if (session?.user && !isSubscribed && currentAttempts >= AUTH_LIMIT) {
      setShowSubscribeGate(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          imageData: mode === "photo" ? imageData : "",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر التحليل.");
      }

      setCount(attemptKey, currentAttempts + 1);
      setAttempts(currentAttempts + 1);
      setResult(data.result);
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-[-7rem] h-80 w-80 rounded-full bg-fuchsia-300/45 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-rose-300/55 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 soft-ring">
                <Sparkles className="h-6 w-6 text-pink-600" />
              </span>
              <h1 className="glowva-gradient text-4xl font-extrabold tracking-normal sm:text-5xl">Glowva</h1>
            </div>
            <p className="mt-2 max-w-xl text-sm font-medium text-pink-950/70 sm:text-base">
              ذكاء عربي للمكياج، من اسم المنتج أو صورته إلى المتاجر والبدائل الأقرب.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={installApp}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-pink-700 soft-ring transition hover:bg-white"
                title="تثبيت التطبيق"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            {session?.user ? (
              <button
                onClick={signOut}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-pink-700 soft-ring transition hover:bg-white"
                title="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthGate(true)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/70 text-pink-700 soft-ring transition hover:bg-white"
                title="تسجيل الدخول"
              >
                <LogIn className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass rounded-[2rem] p-4 sm:p-6">
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-white/55 p-1">
              <button
                onClick={() => setMode("name")}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                  mode === "name" ? "bg-pink-600 text-white shadow-lg shadow-pink-500/25" : "text-pink-950/70"
                }`}
              >
                <Search className="h-4 w-4" />
                اكتبي الاسم
              </button>
              <button
                onClick={() => setMode("photo")}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                  mode === "photo" ? "bg-pink-600 text-white shadow-lg shadow-pink-500/25" : "text-pink-950/70"
                }`}
              >
                <Camera className="h-4 w-4" />
                صوّري المنتج
              </button>
            </div>

            {mode === "name" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-pink-950/75">اسم المنتج</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="مثال: Dior Lip Glow 001"
                  className="h-14 w-full rounded-2xl border border-white/70 bg-white/70 px-4 text-base font-medium text-pink-950 outline-none transition placeholder:text-pink-950/35 focus:border-pink-400 focus:bg-white"
                />
              </label>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => handleImage(event.target.files?.[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-pink-300 bg-white/55 px-4 text-pink-800 transition hover:bg-white/75"
                >
                  <Upload className="h-9 w-9" />
                  <span className="text-base font-extrabold">{imageName || "ارفعي صورة المنتج"}</span>
                </button>
                {imageData && (
                  <img
                    src={imageData}
                    alt="صورة المنتج"
                    className="mt-4 h-56 w-full rounded-3xl object-cover soft-ring"
                  />
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={analyze}
                disabled={loading}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-pink-600 via-fuchsia-500 to-rose-400 px-6 text-base font-extrabold text-white shadow-xl shadow-pink-600/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}
                تحليل
              </button>
              <span className="rounded-full bg-white/60 px-4 py-3 text-sm font-bold text-pink-950/65 soft-ring">
                المحاولات: {remaining}
              </span>
            </div>

            {error && <p className="mt-4 rounded-2xl bg-rose-100/80 p-3 text-sm font-bold text-rose-700">{error}</p>}
            {showAuthGate && <AuthGate email={email} setEmail={setEmail} signIn={signIn} message={authMessage} />}
            {showSubscribeGate && <SubscribeGate />}
          </div>

          <aside className="glass rounded-[2rem] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-600" />
              <h2 className="text-xl font-extrabold text-pink-950">ترند البحث</h2>
            </div>
            <div className="grid gap-3">
              {(trending.length ? trending : [{ product_name: "Rare Beauty Blush" }, { product_name: "Dior Lip Glow" }, { product_name: "Huda Beauty Powder" }]).map((item, index) => (
                <button
                  key={`${normalizeTrendName(item)}-${index}`}
                  onClick={() => {
                    setMode("name");
                    setQuery(normalizeTrendName(item));
                  }}
                  className="flex items-center justify-between rounded-2xl bg-white/55 px-4 py-3 text-right transition hover:bg-white/80"
                >
                  <span className="font-bold text-pink-950">{normalizeTrendName(item)}</span>
                  <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-extrabold text-pink-700">
                    {item.search_count || item.count || item.total || index + 1}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </section>

        {result && <ResultPanel result={result} />}
      </div>
    </main>
  );
}

function AuthGate({ email, setEmail, signIn, message }) {
  return (
    <div className="mt-5 rounded-3xl bg-white/65 p-4 soft-ring">
      <div className="mb-3 flex items-center gap-2">
        <LogIn className="h-5 w-5 text-pink-600" />
        <h3 className="text-lg font-extrabold text-pink-950">تسجيل مجاني</h3>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="name@email.com"
          className="h-12 flex-1 rounded-2xl border border-pink-100 bg-white/80 px-4 text-left text-pink-950 outline-none focus:border-pink-400"
          dir="ltr"
        />
        <button
          onClick={signIn}
          className="h-12 rounded-2xl bg-pink-600 px-5 font-extrabold text-white transition hover:bg-pink-700"
        >
          إرسال الرابط
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-pink-800">{message}</p>}
    </div>
  );
}

function SubscribeGate() {
  return (
    <div className="mt-5 grid gap-3 rounded-3xl bg-white/65 p-4 soft-ring sm:grid-cols-2">
      <Plan title="شهري" price="19" cadence="ريال" />
      <Plan title="سنوي" price="149" cadence="ريال" featured />
    </div>
  );
}

function Plan({ title, price, cadence, featured }) {
  return (
    <div className={`rounded-2xl p-4 ${featured ? "bg-pink-600 text-white" : "bg-white/75 text-pink-950"}`}>
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-5 w-5" />
        <h3 className="text-lg font-extrabold">{title}</h3>
      </div>
      <p className="text-3xl font-extrabold">
        {price} <span className="text-sm font-bold">{cadence}</span>
      </p>
      <button
        className={`mt-4 h-11 w-full rounded-xl font-extrabold ${
          featured ? "bg-white text-pink-700" : "bg-pink-600 text-white"
        }`}
      >
        اشتراك
      </button>
    </div>
  );
}

function ResultPanel({ result }) {
  const stores = Array.isArray(result.stores) ? result.stores.slice(0, 3) : [];
  const tips = Array.isArray(result.tips) ? result.tips : [];

  return (
    <section className="glass rounded-[2rem] p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl bg-white/62 p-5 soft-ring lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-pink-600" />
            <h2 className="text-2xl font-extrabold text-pink-950">{result.product?.name || "المنتج"}</h2>
          </div>
          <p className="text-sm font-bold text-pink-950/60">
            {result.product?.brand} · {result.product?.category} {result.product?.shade ? `· ${result.product.shade}` : ""}
          </p>
          <p className="mt-4 leading-8 text-pink-950/75">{result.product?.description}</p>
          <div className="mt-5 rounded-2xl bg-pink-50/90 p-4">
            <p className="text-sm font-extrabold text-pink-700">الأكثر انتشارًا</p>
            <p className="mt-1 text-lg font-extrabold text-pink-950">
              {result.popularity?.country} · {result.popularity?.city}
            </p>
            <p className="mt-2 text-sm font-medium leading-7 text-pink-950/68">{result.popularity?.reason}</p>
          </div>
        </article>

        <article className="rounded-3xl bg-pink-950 p-5 text-white">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-200" />
            <h2 className="text-xl font-extrabold">البديل الأقرب</h2>
          </div>
          <p className="text-2xl font-extrabold">{result.dupe?.name}</p>
          <p className="mt-1 text-sm text-pink-100/75">{result.dupe?.brand}</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-l from-pink-300 to-fuchsia-300"
              style={{ width: `${Math.min(Math.max(Number(result.dupe?.match || 0), 0), 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-bold">{result.dupe?.match || 0}% تطابق</p>
          <p className="mt-4 text-sm leading-7 text-pink-50/85">{result.dupe?.reason}</p>
          {result.dupe?.url && (
            <a href={result.dupe.url} target="_blank" className="mt-4 inline-flex font-extrabold text-pink-200">
              رابط البديل
            </a>
          )}
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-3xl bg-white/62 p-5 soft-ring">
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-5 w-5 text-pink-600" />
            <h3 className="text-xl font-extrabold text-pink-950">متاجر خليجية</h3>
          </div>
          <div className="grid gap-3">
            {stores.map((store, index) => (
              <a
                key={`${store.name}-${index}`}
                href={store.url}
                target="_blank"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white"
              >
                <span>
                  <strong className="block text-pink-950">{store.name}</strong>
                  <small className="text-pink-950/55">{store.note}</small>
                </span>
                <span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-extrabold text-pink-700">
                  {store.price || "شراء"}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/62 p-5 soft-ring">
          <h3 className="text-xl font-extrabold text-pink-950">ملاحظات ذكية</h3>
          <div className="mt-4 grid gap-3">
            {(tips.length ? tips : ["راجعي درجة اللون على بشرتك قبل الشراء.", "قارني السعر مع الشحن ومدة التوصيل."]).map((tip, index) => (
              <p key={`${tip}-${index}`} className="rounded-2xl bg-white/70 p-3 text-sm font-bold leading-7 text-pink-950/70">
                {tip}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
