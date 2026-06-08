export function getClientIp(headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function jsonError(message, status = 400, extra = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export function normalizeQuery(input) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function assertSafeQuery(query) {
  if (!query) return;
  if (query.length < 2) throw new Error("اكتبي اسم منتج أوضح.");
  if (query.length > 180) throw new Error("اسم المنتج طويل جداً.");
}

export function parseDataImage(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("صيغة الصورة غير مدعومة.");
  }

  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("صيغة الصورة غير مدعومة.");

  const mediaType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const data = match[2];
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > 4 * 1024 * 1024) {
    throw new Error("حجم الصورة كبير. ارفعي صورة أقل من 4MB.");
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data,
    },
  };
}
