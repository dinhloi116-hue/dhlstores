import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 901 : 902,
      openId: `catalog-${role}`,
      name: "Catalog tester",
      email: "catalog@example.com",
      loginMethod: "manus",
      role,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("catalogAdmin", () => {
  it("shows the three empty physical product categories to an administrator", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const categories = await caller.catalogAdmin.categories();

    expect(categories.map(category => category.slug)).toEqual(expect.arrayContaining([
      "quan-ao-bong-da",
      "patch-tay",
      "nameset-chong-nhiem",
    ]));
  });

  it("lets an administrator create and hide a category and product", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const suffix = Date.now().toString(36);
    const category = await caller.catalogAdmin.createCategory({
      name: `Kiểm thử ${suffix}`,
      slug: `kiem-thu-${suffix}`,
      description: "Danh mục quản trị thử nghiệm",
      isActive: true,
    });

    expect(category?.isActive).toBe(true);
    expect(category?.id).toBeTypeOf("number");

    const product = await caller.catalogAdmin.createProduct({
      name: `Tài nguyên ${suffix}`,
      slug: `tai-nguyen-${suffix}`,
      description: "Sản phẩm quản trị thử nghiệm",
      price: 123000,
      categoryId: category!.id,
      image: "/manus-storage/catalog/test-cover.png",
      fileUrl: "/manus-storage/catalog/test-resource.zip",
      fileSize: "1 MB",
      specs: "ZIP",
      featured: false,
      isActive: true,
    });

    expect(product?.fileUrl).toContain("test-resource.zip");
    await caller.catalogAdmin.updateProduct({
      productId: product!.id,
      data: {
        name: product!.name,
        slug: product!.slug,
        description: product!.description,
        price: 123000,
        categoryId: category!.id,
        image: product!.image,
        fileUrl: product!.fileUrl,
        fileSize: product!.fileSize,
        specs: product!.specs,
        featured: true,
        isActive: false,
      },
    });

    const products = await caller.catalogAdmin.products();
    expect(products.find(item => item.id === product!.id)).toMatchObject({ isActive: false, featured: true });
  });

  it("saves the selected purchase layout for a physical product", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const suffix = Date.now().toString(36);
    const physicalCategory = (await caller.catalogAdmin.categories()).find(category => category.slug === "quan-ao-bong-da");
    const product = await caller.catalogAdmin.createProduct({
      name: `Bố cục mua ${suffix}`,
      slug: `bo-cuc-mua-${suffix}`,
      description: "Kiểm thử hai giao diện mua hàng",
      price: 211700,
      categoryId: physicalCategory!.id,
      image: "/manus-storage/catalog/layout-test.png",
      stock: 0,
      purchaseLayout: "marketplace",
      featured: false,
      isActive: true,
    });
    expect(product).toMatchObject({ type: "physical", purchaseLayout: "marketplace" });

    await caller.catalogAdmin.updateProduct({
      productId: product!.id,
      data: { name: product!.name, slug: product!.slug, description: product!.description, price: 211700, categoryId: physicalCategory!.id, image: product!.image, stock: 0, purchaseLayout: "classic", featured: false, isActive: true },
    });
    expect((await caller.catalogAdmin.products()).find(item => item.id === product!.id)?.purchaseLayout).toBe("classic");
  });

  it("does not expose catalog administration to regular users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.catalogAdmin.products()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores flexible product options alongside SKU and stock for a physical variant", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const suffix = Date.now().toString(36);
    const categories = await caller.catalogAdmin.categories();
    const physicalCategory = categories.find(category => category.slug === "quan-ao-bong-da");
    expect(physicalCategory).toBeDefined();

    const product = await caller.catalogAdmin.createProduct({
      name: `Áo thử nghiệm ${suffix}`,
      slug: `ao-thu-nghiem-${suffix}`,
      description: "Sản phẩm vật lý có lựa chọn linh hoạt",
      price: 2000,
      categoryId: physicalCategory!.id,
      image: "/manus-storage/catalog/test-shirt.png",
      stock: 0,
      featured: false,
      isActive: true,
    });

    const created = await caller.catalogAdmin.createProductVariant({
      productId: product!.id,
      color: "Đỏ",
      attributes: "Kiểu: Sân khách\nChất liệu: Thun lạnh",
      sku: `FLEX-${suffix}`,
      image: "https://example.com/variant-red.jpg",
      priceAdjustment: 10000,
      stock: 12,
      isActive: true,
    });

    expect(created).toMatchObject({ color: "Đỏ", sku: `FLEX-${suffix}`, stock: 12, attributes: "Kiểu: Sân khách\nChất liệu: Thun lạnh" });
    const variants = await caller.catalogAdmin.productVariants({ productId: product!.id });
    expect(variants.find(variant => variant.id === created!.id)?.attributes).toContain("Chất liệu: Thun lạnh");
    expect(variants.find(variant => variant.id === created!.id)?.image).toBe("https://example.com/variant-red.jpg");
  });

  it("creates SKU combinations from saved product option groups", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const suffix = Date.now().toString(36);
    const physicalCategory = (await caller.catalogAdmin.categories()).find(category => category.slug === "quan-ao-bong-da");
    const product = await caller.catalogAdmin.createProduct({
      name: `Áo tổ hợp ${suffix}`,
      slug: `ao-to-hop-${suffix}`,
      description: "Sản phẩm kiểm thử tổ hợp",
      price: 2000,
      categoryId: physicalCategory!.id,
      image: "/manus-storage/catalog/test-combination.png",
      stock: 0,
      featured: false,
      isActive: true,
    });

    await caller.catalogAdmin.saveProductOptionGroups({ productId: product!.id, groups: [
      { name: "Màu sắc", values: ["Đỏ", "Xanh"] },
      { name: "Kiểu", values: ["Sân nhà", "Sân khách"] },
    ] });
    const result = await caller.catalogAdmin.generateProductVariantCombinations({ productId: product!.id, skuPrefix: "DHL", stock: 7, priceAdjustment: 10000 });
    expect(result).toMatchObject({ created: 4, skipped: 0 });

    const variants = await caller.catalogAdmin.productVariants({ productId: product!.id });
    expect(variants).toHaveLength(4);
    expect(variants).toEqual(expect.arrayContaining([expect.objectContaining({ stock: 7, sku: expect.stringContaining("DHL"), attributes: expect.stringContaining("Màu sắc") })]));
  });

  it("updates selected SKU values in bulk and saves wholesale quantity tiers", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const suffix = `bulk-${Date.now().toString(36)}`;
    const physicalCategory = (await caller.catalogAdmin.categories()).find(category => category.slug === "patch-tay");
    const product = await caller.catalogAdmin.createProduct({ name: `Patch hàng loạt ${suffix}`, slug: `patch-hang-loat-${suffix}`, description: "Kiểm thử cập nhật nhanh SKU", price: 100000, categoryId: physicalCategory!.id, image: "/manus-storage/catalog/test-patch.png", stock: 0, featured: false, isActive: true });
    const first = await caller.catalogAdmin.createProductVariant({ productId: product!.id, sku: `BULK-A-${suffix}`, priceAdjustment: 0, stock: 1, isActive: true });
    const second = await caller.catalogAdmin.createProductVariant({ productId: product!.id, sku: `BULK-B-${suffix}`, priceAdjustment: 0, stock: 2, isActive: true });

    await expect(caller.catalogAdmin.bulkUpdateProductVariants({ productId: product!.id, changes: [{ variantId: first!.id, stock: 15, priceAdjustment: 10000 }, { variantId: second!.id, stock: 25, priceAdjustment: 20000, isActive: false }] })).resolves.toMatchObject({ success: true, updated: 2 });
    expect(await caller.catalogAdmin.productVariants({ productId: product!.id })).toEqual(expect.arrayContaining([expect.objectContaining({ id: first!.id, stock: 15, priceAdjustment: "10000" }), expect.objectContaining({ id: second!.id, stock: 25, priceAdjustment: "20000", isActive: false })]));

    await caller.catalogAdmin.replaceProductWholesaleTiers({ productId: product!.id, tiers: [{ minQuantity: 10, unitPrice: 85000 }, { minQuantity: 25, unitPrice: 75000 }, { minQuantity: 50, unitPrice: 65000 }] });
    expect(await caller.catalogAdmin.productWholesaleTiers({ productId: product!.id })).toEqual(expect.arrayContaining([expect.objectContaining({ minQuantity: 10, unitPrice: "85000.00" }), expect.objectContaining({ minQuantity: 25, unitPrice: "75000.00" }), expect.objectContaining({ minQuantity: 50, unitPrice: "65000.00" })]));
  });
});
