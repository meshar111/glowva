import { NextResponse } from "next/server";
import { getRequestLocation } from "@/lib/location";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const JSON_FALLBACK = {
  product: {
    name: "Unknown",
    brand: "Unknown",
    category: "Makeup",
    description: "Not enough product details were found.",
  },
  popularity: {
    country: "Unknown",
    city: "Unknown",
    reason: "Not enough popularity data was found.",
  },
  stores: [],
  dupe: {
    name: "Unknown",
    brand: "Unknown",
    match: 0,
    reason: "No reliable alternative was found.",
  },
  tips: [],
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

function normalizeUnclearImageResult(result) {
  return {
    ...result,
    product: {
      ...(result.product || {}),
      name: "غير واضح من الصورة",
      brand: "غير واضح من الصورة",
      category: result.product?.category || "مكياج",
      description: "لم أستطع قراءة اسم المنتج أو البراند من الصورة بوضوح.",
    },
    stores: [],
    dupe: {
      name: "غير واضح",
      brand: "غير واضح",
      match: 0,
      reason: "لا يمكن اقتراح بديل موثوق بدون تحديد المنتج الأصلي.",
    },
    tips: [
      "صوري واجهة العبوة من قريب وبإضاءة واضحة.",
      "تأكدي أن اسم البراند واسم المنتج والدرجة ظاهرين في الصورة.",
    ],
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
      return NextResponse.json({ error: "Enter a product name or upload a product photo." }, { status: 400 });
    }

    const modeInstruction = imageContent
      ? `The user uploaded a product image. Be conservative: identify the product only from visible packaging, logo, label text, shade names, or unmistakable product shape. Do not guess a brand or product from color, packaging style, or popularity alone. If the label is blurry, cropped, hidden, or unreadable, set product.name and product.brand to "غير واضح من الصورة", set dupe.match to 0, leave stores as an empty array, and use tips to ask for a clearer front-facing photo showing the product name.`
      : `The user provided a product name. Analyze that named product.`;

    const prompt = `You are Glowva's Arabic makeup analyst.
Return valid JSON only, with no Markdown, using exactly this shape:
{
  "product": {"name": "", "brand": "", "category": "", "description": "", "shade": ""},
  "popularity": {"country": "", "city": "", "reason": ""},
  "stores": [{"name": "", "price": "", "url": "", "note": ""}],
  "dupe": {"name": "", "brand": "", "match": 0, "url": "", "reason": ""},
  "tips": []
}
${modeInstruction}
Write every user-facing value in clear, natural Arabic. Only pick stores when you are confident about the exact product. Pick up to 3 Gulf stores from Noon, Amazon Saudi, Golden Scent, Nice One, and Sephora. Use direct purchase links or reliable search links. Keep the tone concise and friendly.`;

    const content = [{ type: "text", text: `${prompt}\n\nUser input: ${query || "Attached product photo"}` }];
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
        temperature: 0,
        messages: [{ role: "user", content }],
      }),
    });

    const anthropicJson = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic analyze failed", anthropicJson);
      return NextResponse.json({ error: "Product analysis is unavailable right now." }, { status: 502 });
    }

    const text = (anthropicJson.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    let result = extractJson(text);

    if (imageContent && !query) {
      const productName = String(result.product?.name || "").trim().toLowerCase();
      const brandName = String(result.product?.brand || "").trim().toLowerCase();
      const isUnclear =
        !productName ||
        !brandName ||
        productName === "unknown" ||
        brandName === "unknown" ||
        productName.includes("غير واضح") ||
        brandName.includes("غير واضح");

      if (isUnclear) result = normalizeUnclearImageResult(result);
    }

    try {
      const supabase = getSupabaseServiceClient();
      const productName = result.product?.name || query || "unknown";
      const { error } = await supabase.from("searches").insert({
        product_name: productName,
        query: query || productName,
        country,
        city,
        result,
      });

      if (error) console.warn("Supabase search insert skipped", error.message);
    } catch (storageError) {
      console.warn("Supabase search storage skipped", storageError.message);
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Analyze endpoint failed", error);
    return NextResponse.json({ error: "Unexpected analysis error." }, { status: 500 });
  }
}
