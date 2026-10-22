import { describe, expect, it } from "vitest";
import { formatLocalizedPrice, localizedPriceUsd } from "../client/src/lib/pricing";

describe("international storefront pricing", () => {
  it("doubles a VND physical price when displayed in English USD", () => {
    expect(localizedPriceUsd(329_000, "en")).toBeCloseTo(26.32, 2);
    expect(formatLocalizedPrice(329_000, "en")).toBe("$26.32");
  });

  it("uses a fixed digital USD selling price in English and keeps Vietnam price unchanged", () => {
    expect(localizedPriceUsd(25_000, "en", 1)).toBe(1);
    expect(formatLocalizedPrice(25_000, "vi", 1)).toBe("25.000 ₫");
  });
});
