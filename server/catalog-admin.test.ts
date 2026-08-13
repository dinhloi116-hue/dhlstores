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
});
