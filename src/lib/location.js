export function getRequestLocation(headers) {
  const country = headers.get("x-vercel-ip-country") || "unknown";
  const rawCity = headers.get("x-vercel-ip-city") || "unknown";
  const city = decodeURIComponent(rawCity.replace(/\+/g, " "));

  return { country, city };
}
