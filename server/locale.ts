import type { IncomingHttpHeaders } from "node:http";

export type StoreLocale = "vi" | "en";
export type LocaleSource = "country-header" | "ip-lookup" | "fallback";

function firstHeaderValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim() || "";
}

export function localeFromCountry(countryCode?: string | null): StoreLocale {
  return countryCode?.trim().toUpperCase() === "VN" ? "vi" : "en";
}

export function countryFromHeaders(headers: IncomingHttpHeaders) {
  const candidate = firstHeaderValue(headers["cf-ipcountry"])
    || firstHeaderValue(headers["x-vercel-ip-country"])
    || firstHeaderValue(headers["x-country-code"]);
  return /^[A-Za-z]{2}$/.test(candidate) ? candidate.toUpperCase() : null;
}

export function clientIpFromHeaders(headers: IncomingHttpHeaders) {
  const forwarded = firstHeaderValue(headers["x-forwarded-for"]);
  if (!forwarded || forwarded === "::1" || forwarded === "127.0.0.1") return null;
  return /^[0-9a-fA-F:.]+$/.test(forwarded) ? forwarded : null;
}

export async function resolveStoreLocale(headers: IncomingHttpHeaders): Promise<{ locale: StoreLocale; country: string | null; source: LocaleSource }> {
  const headerCountry = countryFromHeaders(headers);
  if (headerCountry) return { locale: localeFromCountry(headerCountry), country: headerCountry, source: "country-header" };

  const clientIp = clientIpFromHeaders(headers);
  if (!clientIp) return { locale: "en", country: null, source: "fallback" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    const response = await fetch(`https://api.country.is/${encodeURIComponent(clientIp)}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return { locale: "en", country: null, source: "fallback" };
    const data = await response.json() as { country?: string };
    const country = /^[A-Za-z]{2}$/.test(data.country || "") ? data.country!.toUpperCase() : null;
    return country ? { locale: localeFromCountry(country), country, source: "ip-lookup" } : { locale: "en", country: null, source: "fallback" };
  } catch {
    return { locale: "en", country: null, source: "fallback" };
  }
}
