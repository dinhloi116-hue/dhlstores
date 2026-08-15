import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home product search", () => {
  it("filters products from a keyword and exposes linked product suggestions", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [searchTerm, setSearchTerm] = useState("")');
    expect(source).toContain("const searchSuggestions = !normalizedSearchTerm");
    expect(source).toContain("Tìm nhanh sản phẩm");
    expect(source).toContain("Gợi ý ${searchSuggestions.length} sản phẩm phù hợp");
    expect(source).toContain("href={`/product/${product.slug}`}");
    expect(source).toContain("Không tìm thấy sản phẩm phù hợp");
  });
});
