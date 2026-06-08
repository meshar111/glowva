import DashboardClient from "./DashboardClient";
import DashboardLogin from "./DashboardLogin";
import { getCookieUser } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCookieUser();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  if (!user || user.email?.toLowerCase() !== adminEmail) {
    return <DashboardLogin />;
  }

  return <DashboardClient />;
}
