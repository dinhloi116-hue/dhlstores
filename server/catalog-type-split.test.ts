import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const products = readFileSync(new URL("../client/src/pages/Products.tsx", import.meta.url), "utf8");

describe("catalog type split", () => {
  it("gives customers clear digital and physical entry points", () => {
    expect(home).toContain("/products?type=digital");
    expect(home).toContain("/products?type=physical");
    expect(home).toContain("Tài nguyên số");
    expect(home).toContain("Hàng vật lý");
    expect(home).toContain("Có SKU / tồn kho");
    expect(home).toContain("Tải file");
  });

  it("applies the type query to the real catalog request", () => {
    expect(products).toContain("const isDigitalCatalog = initialType === \"digital\"");
    expect(products).toContain("type: isTypeScoped ? (isPhysicalCatalog ? \"physical\" : \"digital\") : undefined");
    expect(products).toContain("product.type === (isPhysicalCatalog ? \"physical\" : \"digital\")");
  });
});
