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
      sku: `AO-${suffix}`,
      priceAdjustment: 10000,
      stock: 12,
      isActive: true,
    });

    expect(created).toMatchObject({ color: "Đỏ", sku: `AO-${suffix}`, stock: 12, attributes: "Kiểu: Sân khách\nChất liệu: Thun lạnh" });
    const variants = await caller.catalogAdmin.productVariants({ productId: product!.id });
    expect(variants.find(variant => variant.id === created!.id)?.attributes).toContain("Chất liệu: Thun lạnh");
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
});
