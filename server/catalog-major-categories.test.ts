import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const catalogPagePath = path.resolve(process.cwd(), "client/src/pages/Products.tsx");

describe("catalog major categories rail", () => {
  it("keeps search and exposes main categories directly below the toolbar", async () => {
    const source = await readFile(catalogPagePath, "utf8");

    expect(source).toContain('placeholder={t.searchPlaceholder}');
    expect(source).toContain('id="catalog-major-categories"');
    expect(source).toContain("Danh mục lớn");
    expect(source).toContain("Main categories");
    expect(source).toContain("categories.map(category =>");
    expect(source).toContain("onClick={() => setSelectedCategory(category.id)}");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("focus-visible:ring-2 focus-visible:ring-sky-400");
  });

  it("does not duplicate the major category buttons inside advanced filters", async () => {
    const source = await readFile(catalogPagePath, "utf8");
    const advancedFilters = source.slice(source.indexOf('<details className="group mt-2'), source.indexOf('</details>') + '</details>'.length);

    expect(advancedFilters).not.toContain("categories.map(category =>");
    expect(advancedFilters).not.toContain("catalog-major-categories");
    expect(advancedFilters).toContain("catalogQuickFilter");
  });
});
