import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("v_top_products").select("*").limit(8);

    if (error) {
      console.warn("Trending query skipped", error.message);
      return NextResponse.json({ products: [] });
    }

    return NextResponse.json({ products: data || [] });
  } catch (error) {
    console.warn("Trending endpoint skipped", error.message);
    return NextResponse.json({ products: [] });
  }
}
