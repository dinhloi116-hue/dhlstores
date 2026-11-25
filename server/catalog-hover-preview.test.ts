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
    expect(source).toContain("600");
    expect(source).toContain("aria-label={lang === 'vi' ? `Đang xem ảnh");
    expect(source).toContain("motion-safe:animate-[dhl-card-image-in_220ms_ease-out]");
  });

  it("cycles gallery images on homepage hover at the faster shared cadence", async () => {
    const homeSource = await readFile(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

    expect(homeSource).toContain("const [hoverPreview, setHoverPreview]");
    expect(homeSource).toContain("setInterval");
    expect(homeSource).toContain("(current.index + 1) % images.length");
    expect(homeSource).toContain("}), 600);");
    expect(homeSource).toContain("motion-safe:animate-[dhl-card-image-in_110ms_ease-out]");
  });

  it("keeps the preview indicator desktop-only and does not create a new data request", async () => {
    const source = await readFile(catalogPagePath, "utf8");

    expect(source).toContain("hidden items-center gap-1");
    expect(source).toContain("sm:flex");
    expect(source).not.toContain("trpc.store.productGallery");
  });
});
