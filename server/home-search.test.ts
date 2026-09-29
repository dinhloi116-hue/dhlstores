import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("home product search", () => {
  it("filters products from a keyword and exposes linked product suggestions", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('const [searchTerm, setSearchTerm] = useState("")');
    expect(source).toContain("const suggestions = useMemo(() => !normalizedSearch ? [] : allProducts.filter");
    expect(source).toContain("Tìm sản phẩm, SKU, tên áo, patch...");
    expect(source).toContain("href={`/product/${product.slug}`}");
    expect(source).toContain("Không tìm thấy sản phẩm");
  });
});
