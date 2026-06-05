import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("v_top_products").select("*").limit(8);

    if (error) {
      console.error("Trending query failed", error);
      return NextResponse.json({ products: [] });
    }

    return NextResponse.json({ products: data || [] });
  } catch (error) {
    console.error("Trending endpoint failed", error);
    return NextResponse.json({ products: [] });
  }
}
