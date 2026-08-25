import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalogDescription, catalogName } from "../client/src/lib/catalogLocale";

describe("bilingual catalog presentation", () => {
  const item = {
    name: "Tên tiếng Việt",
    nameEn: "English name",
    description: "Mô tả tiếng Việt",
    descriptionEn: "English description",
  };

  it("selects translated catalog content for English and preserves Vietnamese", () => {
    expect(catalogName(item, "vi")).toBe("Tên tiếng Việt");
    expect(catalogDescription(item, "vi")).toBe("Mô tả tiếng Việt");
    expect(catalogName(item, "en")).toBe("English name");
    expect(catalogDescription(item, "en")).toBe("English description");
  });

  it("falls back safely when an English translation has not been filled", () => {
    expect(catalogName({ name: "Tên tiếng Việt" }, "en")).toBe("Tên tiếng Việt");
    expect(catalogDescription({ name: "Tên", description: "Mô tả" }, "en")).toBe("Mô tả");
  });

  it("uses browser locale only when visitors have not selected a language", async () => {
    const source = await readFile(path.resolve(process.cwd(), "client/src/lib/i18n.ts"), "utf8");
    expect(source).toContain("navigator.languages");
    expect(source).toContain("startsWith('vi')");
    expect(source).toContain("dhl_lang_selected");
    expect(source).toContain("dhl_lang_detected");
  });
});
