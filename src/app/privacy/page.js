export const metadata = {
  title: "سياسة الخصوصية | Glowva",
  description: "سياسة خصوصية Glowva وفق مبادئ الشفافية وحماية البيانات.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 leading-8 text-pink-950">
      <h1 className="glowva-gradient text-4xl font-extrabold">سياسة الخصوصية</h1>
      <p className="mt-5">
        تجمع Glowva البيانات اللازمة لتقديم خدمة تحليل منتجات المكياج وتحسينها، مثل البريد الإلكتروني عند تسجيل الدخول،
        طلبات البحث، نتائج التحليل، معلومات عامة عن البلد/المدينة عند توفرها، وبيانات الاشتراك عند الدفع.
      </p>
      <h2 className="mt-8 text-2xl font-extrabold">الاستخدام والاحتفاظ</h2>
      <p className="mt-3">
        نستخدم البيانات لتقديم الخدمة، تطبيق حدود الاستخدام، منع الإساءة، تحسين الدقة، وإدارة الاشتراكات. يمكن طلب حذف
        البيانات أو تصحيحها عبر بريد الدعم.
      </p>
      <h2 className="mt-8 text-2xl font-extrabold">حقوقك</h2>
      <p className="mt-3">
        يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها أو الاعتراض على معالجتها حيث ينطبق ذلك وفق نظام حماية البيانات
        الشخصية السعودي PDPL ومبادئ GDPR.
      </p>
      <h2 className="mt-8 text-2xl font-extrabold">الأطراف الثالثة</h2>
      <p className="mt-3">
        تستخدم Glowva مزودي خدمة مثل Supabase للاستضافة وقاعدة البيانات، Anthropic للتحليل بالذكاء الاصطناعي، وStripe
        لمعالجة المدفوعات. لا نبيع بياناتك الشخصية.
      </p>
    </main>
  );
}
