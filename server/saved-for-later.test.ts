import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("saved for later and restock UX", () => {
  it("registers a dedicated saved products route and account menu entry", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/StoreLayout.tsx", import.meta.url), "utf8");
    expect(app).toContain('const SavedForLater = lazy(() => import("@/pages/SavedForLater"));');
    expect(app).toContain('<Route path={"/saved"} component={SavedForLater} />');
    expect(layout).toContain('href="/saved"');
    expect(layout).toContain("Lưu mua sau");
  });

  it("lists favorites, supports restock cancellation, and offers a fast purchase CTA", () => {
    const page = readFileSync(new URL("../client/src/pages/SavedForLater.tsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
    expect(page).toContain("trpc.store.favorites.useQuery");
    expect(page).toContain("trpc.store.restockSubscriptions.useQuery");
    expect(page).toContain("trpc.store.cancelRestock.useMutation");
    expect(page).toContain("Lưu để mua sau");
    expect(page).toContain("Mua ngay");
    expect(detail).toContain("Nhắc lại khi có hàng");
    expect(detail).toContain("const restockVariantId = selectedVariant && Number(selectedVariant.stock) <= 0");
    expect(detail).toContain("Lưu sản phẩm để mua sau");
    expect(detail).toContain("Mua ngay");
  });
});
