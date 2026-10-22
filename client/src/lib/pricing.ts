import type { Language } from "./i18n";

/** International storefront prices are intentionally set at 2x the Vietnam price. */
export const INTERNATIONAL_PRICE_MULTIPLIER = 2;
export const VND_PER_USD = 25_000;

export function internationalVnd(value: number): number {
  return value * INTERNATIONAL_PRICE_MULTIPLIER;
}

export function localizedPriceUsd(valueVnd: number, language: Language, fixedUsd?: number | string | null): number {
  if (language !== "en") return valueVnd;
  const baseUsd = Number(fixedUsd);
  // A manually entered USD price is already the final international selling price.
  // Products without one continue to use the storefront's 2x VND conversion.
  return Number.isFinite(baseUsd) && baseUsd > 0 ? baseUsd : (valueVnd / VND_PER_USD) * INTERNATIONAL_PRICE_MULTIPLIER;
}

export function formatLocalizedPrice(valueVnd: number, language: Language, fixedUsd?: number | string | null): string {
  if (!Number.isFinite(valueVnd) || valueVnd <= 0) return language === "vi" ? "Đang cập nhật giá" : "Price being updated";
  if (language === "en") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(localizedPriceUsd(valueVnd, language, fixedUsd));
  }
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(valueVnd);
}
