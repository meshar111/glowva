import crypto from "crypto";

export function cacheKeyFor({ query, imageData }) {
  const imageHash = imageData
    ? crypto.createHash("sha256").update(imageData.slice(0, 256_000)).digest("hex")
    : "";
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ query: query.toLowerCase(), imageHash }))
    .digest("hex");
}

export async function getCachedAnalysis(supabase, cacheKey) {
  const { data, error } = await supabase
    .from("analysis_cache")
    .select("result")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data?.result || null;
}

export async function setCachedAnalysis(supabase, cacheKey, result) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const { error } = await supabase.from("analysis_cache").upsert({
    cache_key: cacheKey,
    result,
    expires_at: expiresAt,
  });
  if (error) throw error;
}
