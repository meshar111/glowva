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
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function assertSafeQuery(query) {
  if (!query) return;
  if (query.length < 2) throw new Error("اكتبي اسم منتج أوضح.");
  if (query.length > 180) throw new Error("اسم المنتج طويل جداً.");

  const injectionPatterns = [
    /ignore\s+(all\s+)?previous/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /return\s+markdown/i,
  ];
  if (injectionPatterns.some((pattern) => pattern.test(query))) {
    throw new Error("اكتبي اسم المنتج فقط بدون تعليمات إضافية.");
  }
}

function readImageDimensions(buffer, mediaType) {
  if (mediaType === "image/png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (mediaType === "image/jpeg" && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }

  if (mediaType === "image/webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  return null;
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
  const buffer = Buffer.from(data, "base64");
  const dimensions = readImageDimensions(buffer, mediaType);
  if (!dimensions) throw new Error("تعذر التحقق من أبعاد الصورة.");
  if (Math.max(dimensions.width, dimensions.height) > 1568) {
    throw new Error("أبعاد الصورة كبيرة. ارفعي صورة لا تتجاوز 1568px.");
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

export function safeInternalPath(value, fallback = "/") {
  const path = String(value || fallback);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("\n")) {
    return fallback;
  }
  return path;
}
