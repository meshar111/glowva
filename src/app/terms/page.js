export const metadata = {
  title: "شروط الاستخدام | Glowva",
  description: "شروط استخدام Glowva.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 leading-8 text-pink-950">
      <h1 className="glowva-gradient text-4xl font-extrabold">شروط الاستخدام</h1>
      <p className="mt-5">
        باستخدام Glowva توافقين على استخدام الخدمة لأغراض مشروعة فقط، وعدم إساءة استخدام واجهات الذكاء الاصطناعي أو
        محاولة تجاوز حدود الاستخدام أو الوصول غير المصرح للوحة الأدمن.
      </p>
      <h2 className="mt-8 text-2xl font-extrabold">دقة النتائج</h2>
      <p className="mt-3">
        نتائج تحليل المنتجات تعتمد على المعلومات المتاحة وقد تكون غير مكتملة. عند عدم وضوح الصورة أو الاسم، قد تطلب
        Glowva معلومات إضافية بدلاً من التخمين.
      </p>
      <h2 className="mt-8 text-2xl font-extrabold">الاشتراكات</h2>
      <p className="mt-3">
        تتم إدارة الاشتراكات عبر بوابة دفع آمنة، ولا يتم تفعيل الاشتراك إلا بعد تأكيد الدفع من الخادم عبر webhook.
      </p>
    </main>
  );
}
