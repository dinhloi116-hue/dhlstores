import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

describe("image search", () => {
  it("exposes a public image-search procedure with size and mime guards", () => {
    const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(routers).toContain("imageSearch: publicProcedure");
    expect(routers).toContain("max(8_000_000)");
    expect(routers).toContain("image/jpeg");
    expect(routers).toContain("productId");
  });

  it("renders upload/capture controls and real product result links", () => {
    const layout = readFileSync(resolve(root, "client/src/components/StoreLayout.tsx"), "utf8");
    expect(layout).toContain("Tìm sản phẩm bằng hình ảnh");
    expect(layout).toContain('capture="environment"');
    expect(layout).toContain("imageSearchMutation.mutate");
    expect(layout).toContain("/product/${match.product.slug}");
    expect(layout).toContain("không lưu vào tài khoản");
  });
});
