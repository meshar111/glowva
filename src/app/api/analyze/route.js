import { NextResponse } from "next/server";
import { getRequestLocation } from "@/lib/location";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const JSON_FALLBACK = {
  product: {
    name: "غير معروف",
    brand: "غير معروف",
    category: "مكياج",
    description: "لم نتمكن من استخراج تفاصيل كافية.",
  },
  popularity: {
    country: "غير معروف",
    city: "غير معروف",
    reason: "لا توجد بيانات كافية.",
  },
  stores: [],
  dupe: {
    name: "غير معروف",
    brand: "غير معروف",
    match: 0,
    reason: "لا يوجد بديل موثوق.",
  },
};

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return JSON_FALLBACK;
    try {
      return JSON.parse(match[0]);
    } catch {
      return JSON_FALLBACK;
    }
  }
}

function imageContentFromDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  const [meta, data] = dataUrl.split(",");
  const mediaType = meta.match(/^data:(.*);base64$/)?.[1];
  if (!mediaType || !data) return null;

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data,
    },
  };
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const { country, city } = getRequestLocation(request.headers);
    const body = await request.json();
    const query = (body.query || "").trim();
    const imageContent = imageContentFromDataUrl(body.imageData);

    if (!query && !imageContent) {
      return NextResponse.json({ error: "اكتبي اسم المنتج أو ارفعي صورته." }, { status: 400 });
    }

    const prompt = `أنت محللة مكياج عربية لتطبيق Glowva. استخدمي البحث على الويب عند الحاجة.
المطلوب إرجاع JSON صالح فقط بدون Markdown وبالمفاتيح التالية:
{
  "product": {"name": "", "brand": "", "category": "", "description": "", "shade": ""},
  "popularity": {"country": "", "city": "", "reason": ""},
  "stores": [{"name": "", "price": "", "url": "", "note": ""}],
  "dupe": {"name": "", "brand": "", "match": 0, "url": "", "reason": ""},
  "tips": []
}
اختاري 3 متاجر خليجية فقط من: نون، أمازون السعودية، Golden Scent، Nice One، سيفورا. ضعي روابط شراء مباشرة أو روابط بحث موثوقة. اجعلي اللغة عربية مختصرة وودية.`;

    const content = [
      { type: "text", text: `${prompt}\n\nمدخل المستخدمة: ${query || "صورة منتج مرفقة"}` },
    ];

    if (imageContent) content.push(imageContent);

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1600,
        temperature: 0.2,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
        messages: [{ role: "user", content }],
      }),
    });

    const anthropicJson = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic analyze failed", anthropicJson);
      return NextResponse.json({ error: "تعذر تحليل المنتج الآن." }, { status: 502 });
    }

    const text = (anthropicJson.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    const result = extractJson(text);

    const supabase = getSupabaseServiceClient();
    const productName = result.product?.name || query || "unknown";
    const { error } = await supabase.from("searches").insert({
      product_name: productName,
      query: query || productName,
      country,
      city,
      result,
    });

    if (error) {
      console.error("Supabase search insert failed", error);
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Analyze endpoint failed", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع." }, { status: 500 });
  }
}
