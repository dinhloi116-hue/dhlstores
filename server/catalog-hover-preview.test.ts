import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const catalogPagePath = path.resolve(process.cwd(), "client/src/pages/Products.tsx");

 describe("catalog hover image preview", () => {
  it("cycles a product's own gallery on desktop hover and resets on leave", async () => {
    const source = await readFile(catalogPagePath, "utf8");

    expect(source).toContain("const productCardGallery =");
    expect(source).toContain("const [hoverPreview, setHoverPreview]");
    expect(source).toContain("onMouseEnter={() => cardGallery.length > 1");
    expect(source).toContain("onMouseLeave={() => setHoverPreview");
    expect(source).toContain("setInterval");
    expect(source).toContain("1200");
    expect(source).toContain("aria-label={lang === 'vi' ? `Đang xem ảnh");
    expect(source).toContain("motion-safe:animate-[dhl-card-image-in_220ms_ease-out]");
  });

  it("keeps the preview indicator desktop-only and does not create a new data request", async () => {
    const source = await readFile(catalogPagePath, "utf8");

    expect(source).toContain("hidden items-center gap-1");
    expect(source).toContain("sm:flex");
    expect(source).not.toContain("trpc.store.productGallery");
  });
});
