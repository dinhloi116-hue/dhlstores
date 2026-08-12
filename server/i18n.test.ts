import { describe, expect, it } from "vitest";
import { translations, getClientLanguage } from "../client/src/lib/i18n";

describe("DHL Stores Bilingual i18n & Store Tests", () => {
  it("contains Vietnamese and English translation dictionaries", () => {
    expect(translations.vi).toBeDefined();
    expect(translations.en).toBeDefined();
    expect(translations.vi.home).toBe("Trang chủ");
    expect(translations.en.home).toBe("Home");
    expect(translations.vi.addToCart).toBe("Thêm vào giỏ hàng");
    expect(translations.en.addToCart).toBe("Add to Cart");
  });

  it("returns a valid default language ('vi' or 'en')", () => {
    const lang = getClientLanguage();
    expect(["vi", "en"]).toContain(lang);
  });
});
